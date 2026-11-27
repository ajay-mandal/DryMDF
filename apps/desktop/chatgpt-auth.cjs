const {
  createHash,
  createPublicKey,
  randomBytes,
  randomUUID,
  verify,
} = require("node:crypto");
const { once } = require("node:events");
const { constants } = require("node:fs");
const { mkdir, open, rm } = require("node:fs/promises");
const { createServer } = require("node:http");
const { join, resolve } = require("node:path");
const { replaceFile } = require("./atomic-file.cjs");

const ISSUER = "https://auth.openai.com";
const AUTHORIZE = `${ISSUER}/api/accounts/authorize`;
const TOKEN = `${ISSUER}/api/accounts/oauth/token`;
const REVOKE = `${ISSUER}/api/accounts/oauth/revoke`;
const JWKS = `${ISSUER}/.well-known/jwks.json`;
const RESOURCE = "https://api.openai.com/v1";
const PLAN_SCOPE = "chatgpt.tokens.use.direct";
const SCOPES = `openid profile email offline_access resource.invoke ${PLAN_SCOPE}`;
const DYNAMIC_CLIENT = "dynamic_agent_client";
const LOOPBACK = "127.0.0.1";
const CALLBACK_PATH = "/auth/callback";
const SIGN_IN_MS = 5 * 60_000;
const REQUEST_MS = 15_000;
const REFRESH_MARGIN_MS = 60_000;
const MAX_FILE_BYTES = 256 * 1024;
const TERMINAL_REFRESH_ERRORS = new Set([
  "invalid_grant",
  "invalid_refresh_token",
  "token_expired",
  "refresh_token_expired",
  "refresh_token_invalidated",
  "refresh_token_reused",
  "invalid_client",
]);

class AuthFailure extends Error {
  constructor(status, code) {
    super(status);
    this.status = status;
    this.code = code;
  }
}

const result = (status) => ({ status });
const opaque = (value) =>
  typeof value === "string" && /^[\x21-\x7e]{1,32768}$/.test(value);
const clientIdValid = (value) =>
  typeof value === "string" && /^oaiapp_[A-Za-z0-9_-]{1,255}$/.test(value);
const text = (value) => typeof value === "string" && value.trim().length > 0;
const b64url = (bytes) => randomBytes(bytes).toString("base64url");
const sha256 = (value) => createHash("sha256").update(value).digest();
const planGranted = (tokens) => tokens?.scopes.includes(PLAN_SCOPE) === true;

function abortable(promise, signal) {
  if (!signal) return promise;
  let abort;
  const wrapped = new Promise((resolve, reject) => {
    abort = () => reject(signal.reason);
    Promise.resolve(promise).then(resolve, reject);
    if (signal.aborted) abort();
    else signal.addEventListener("abort", abort, { once: true });
  });
  return wrapped.finally(() => signal.removeEventListener("abort", abort));
}

async function withDeadline(ms, parent, work) {
  const controller = new AbortController();
  const cancel = () => controller.abort(new AuthFailure("cancelled"));
  if (parent?.aborted) cancel();
  else parent?.addEventListener("abort", cancel, { once: true });
  const timer = setTimeout(() => controller.abort(new AuthFailure("timeout")), ms);
  try {
    controller.signal.throwIfAborted();
    return await work(controller.signal);
  } finally {
    clearTimeout(timer);
    parent?.removeEventListener("abort", cancel);
  }
}

function providerRequest(fetch, url, body, parent) {
  return withDeadline(REQUEST_MS, parent, (signal) =>
    abortable(
      (async () => {
        const response = await fetch(url, {
          method: body ? "POST" : "GET",
          headers: {
            accept: "application/json",
            ...(body && { "content-type": "application/x-www-form-urlencoded" }),
          },
          ...(body && { body: new URLSearchParams(body) }),
          redirect: "error",
          signal,
        });
        if (response.status >= 500 || response.status === 429) {
          void response.body?.cancel().catch(() => {});
          throw new AuthFailure("unavailable");
        }
        const data = await response.json();
        if (!response.ok) {
          const rejected = response.status >= 400 && response.status < 500;
          throw new AuthFailure(rejected ? "auth" : "error", rejected ? data?.error : undefined);
        }
        return data;
      })(),
      signal,
    ),
  );
}

function callbackReply(response, status, message) {
  response.writeHead(status, {
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "no-store",
    "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    connection: "close",
  });
  response.end(message);
}

async function authorize({ hostId, registration, clientId, openExternal, signal }) {
  const state = b64url(32);
  const nonce = b64url(32);
  const verifier = b64url(32);
  let settle;
  let consumed = false;
  const callback = new Promise((resolve) => { settle = resolve; });
  const server = createServer({
    headersTimeout: 5_000,
    requestTimeout: 5_000,
    connectionsCheckingInterval: 1_000,
  }, (request, response) => {
    const [path, query] = request.url.split(/\?(.*)/s, 2);
    if (
      request.method !== "GET" || path !== CALLBACK_PATH ||
      request.headers.host !== `${LOOPBACK}:${server.address()?.port}`
    ) {
      callbackReply(response, 404, "Not found.");
      return;
    }
    if (consumed || signal.aborted) {
      callbackReply(response, 410, "This sign-in attempt has ended.");
      return;
    }
    consumed = true;
    const params = new URLSearchParams(query);
    const valid = ["state", "code", "error", "client_id"].every(
      (key) => params.getAll(key).length <= 1,
    );
    const issued = params.get("client_id") ?? clientId;
    const code = params.get("code");
    if (
      !valid || params.get("state") !== state || params.has("error") ||
      !opaque(code) || !clientIdValid(issued) || (clientId && clientId !== issued)
    ) {
      callbackReply(response, 400, "Sign-in did not complete. Return to DryMDF.");
      settle(null);
      return;
    }
    callbackReply(response, 200, "Return to DryMDF to finish signing in.");
    settle({ code, clientId: issued });
  });
  try {
    const listening = once(server, "listening", { signal });
    server.listen({ host: LOOPBACK, port: 0, signal });
    await listening;
    const redirectUri = `http://${LOOPBACK}:${server.address().port}${CALLBACK_PATH}`;
    const url = new URL(AUTHORIZE);
    url.search = new URLSearchParams({
      client_id: clientId ?? DYNAMIC_CLIENT,
      ext_agent_host_id: hostId,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: SCOPES,
      resource: RESOURCE,
      state,
      nonce,
      code_challenge_method: "S256",
      code_challenge: sha256(verifier).toString("base64url"),
    });
    if (!clientId) url.searchParams.set("agent_name_hint", "DryMDF");
    if (registration?.tokens?.idToken) url.searchParams.set("id_token_hint", registration.tokens.idToken);
    if (registration?.needsConsent) url.searchParams.set("prompt", "consent");
    signal.throwIfAborted();
    const [, completed] = await abortable(Promise.all([openExternal(url.toString()), callback]), signal);
    if (!completed) throw new AuthFailure("auth");
    return { ...completed, nonce, verifier, redirectUri };
  } finally {
    server.close();
    server.closeAllConnections();
  }
}

function decodePart(part) {
  const bytes = Buffer.from(part, "base64url");
  if (!part || bytes.toString("base64url") !== part) throw new AuthFailure("auth");
  return bytes;
}

async function verifyIdentity(idToken, { clientId, nonce }, accessToken, fetch, signal) {
  if (!opaque(idToken)) throw new AuthFailure("auth");
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new AuthFailure("auth");
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  let header, claims, signature;
  try {
    header = JSON.parse(decodePart(encodedHeader));
    claims = JSON.parse(decodePart(encodedPayload));
    signature = decodePart(encodedSignature);
  } catch {
    throw new AuthFailure("auth");
  }
  // OpenAI's discovery document advertises RS256; keys come only from its JWKS.
  if (header?.alg !== "RS256" || !text(header.kid) || header.crit !== undefined || header.b64 !== undefined) {
    throw new AuthFailure("auth");
  }
  const jwks = await providerRequest(fetch, JWKS, null, signal);
  if (!Array.isArray(jwks?.keys)) throw new AuthFailure("error");
  const keys = jwks.keys.filter((key) =>
    key?.kid === header.kid && key.kty === "RSA" &&
    (key.alg === undefined || key.alg === "RS256") &&
    (key.use === undefined || key.use === "sig") &&
    (key.key_ops === undefined || (Array.isArray(key.key_ops) && key.key_ops.includes("verify"))),
  );
  if (keys.length !== 1) throw new AuthFailure("auth");
  try {
    const { n, e } = keys[0];
    const key = createPublicKey({ key: { kty: "RSA", n, e }, format: "jwk" });
    if (key.asymmetricKeyDetails.modulusLength < 2048 ||
        !verify("RSA-SHA256", Buffer.from(`${encodedHeader}.${encodedPayload}`), key, signature)) {
      throw new AuthFailure("auth");
    }
  } catch {
    throw new AuthFailure("auth");
  }
  const now = Date.now() / 1000;
  const audience = Array.isArray(claims?.aud) ? claims.aud : [claims?.aud];
  if (
    claims?.iss !== ISSUER || audience.length !== 1 || audience[0] !== clientId ||
    (claims.azp !== undefined && claims.azp !== clientId) ||
    !Number.isFinite(claims.exp) || claims.exp <= now ||
    !Number.isFinite(claims.iat) || claims.iat > now + 5 || claims.iat >= claims.exp ||
    (claims.nbf !== undefined && (!Number.isFinite(claims.nbf) || claims.nbf > now + 5)) ||
    claims.nonce !== nonce || !text(claims.sub) ||
    (claims.at_hash !== undefined && claims.at_hash !== sha256(accessToken).subarray(0, 16).toString("base64url"))
  ) throw new AuthFailure("auth");
  return { subject: claims.sub, ...(text(claims.email) && { email: claims.email }) };
}

function readTokens(data, receivedAt, previous) {
  if (
    !opaque(data?.access_token) || data.token_type?.toLowerCase?.() !== "bearer" ||
    !Number.isSafeInteger(data.expires_in) || data.expires_in <= 0 ||
    !Number.isSafeInteger(receivedAt + data.expires_in * 1000) ||
    (data.scope !== undefined && typeof data.scope !== "string") ||
    ((previous || data.refresh_token !== undefined) && !opaque(data.refresh_token))
  ) throw new AuthFailure("error");
  const scopes = data.scope === undefined
    ? previous?.scopes ?? []
    : data.scope.split(/\s+/).filter(Boolean);
  if (scopes.includes("offline_access") && !opaque(data.refresh_token)) throw new AuthFailure("error");
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    idToken: previous ? previous.idToken : data.id_token,
    expiresAt: receivedAt + data.expires_in * 1000,
    scopes,
  };
}

function usable(record) {
  return planGranted(record?.tokens) && (
    record.tokens.expiresAt > Date.now() || Boolean(record.tokens.refreshToken)
  );
}

function storageAvailable(safeStorage) {
  return safeStorage?.isEncryptionAvailable() && safeStorage.getSelectedStorageBackend?.() !== "basic_text";
}

async function readPrivateFile(path) {
  let file;
  try {
    file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    const stat = await file.stat();
    if (!stat.isFile() || stat.size > MAX_FILE_BYTES || (process.platform !== "win32" && (stat.mode & 0o077))) {
      throw new AuthFailure("error");
    }
    return await file.readFile();
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  } finally {
    await file?.close();
  }
}

// Coordinate all instances in this main process. The app must use one Electron
// main process per userData directory when rotating the same provider session.
const coordinators = new Map();

function createChatGptAuth({ userData, safeStorage, openExternal, fetch = globalThis.fetch }) {
  userData = resolve(userData);
  const hostPath = join(userData, "chatgpt-host-id");
  const recordPath = join(userData, "chatgpt-credentials.enc");
  if (!coordinators.has(userData)) {
    coordinators.set(userData, { queue: Promise.resolve(), epoch: 0 });
  }
  const shared = coordinators.get(userData);
  const serialize = (work) => {
    const next = shared.queue.then(work);
    shared.queue = next.catch(() => {});
    return next;
  };

  async function getHostId(signal) {
    const stored = await readPrivateFile(hostPath);
    if (stored) {
      const id = stored.toString("utf8");
      if (!/^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)) {
        throw new AuthFailure("error");
      }
      return id;
    }
    const id = `urn:uuid:${randomUUID()}`;
    await mkdir(userData, { recursive: true, mode: 0o700 });
    await replaceFile(hostPath, id, { mode: 0o600, beforeRename: () => signal.throwIfAborted() });
    return id;
  }

  async function readRecord() {
    if (!storageAvailable(safeStorage)) throw new AuthFailure("unavailable");
    const ciphertext = await readPrivateFile(recordPath);
    if (!ciphertext) return null;
    const record = JSON.parse(safeStorage.decryptString(ciphertext));
    const tokens = record?.tokens;
    if (
      record?.issuer !== ISSUER || !clientIdValid(record.clientId) || !text(record.subject) ||
      (tokens !== null && (!opaque(tokens?.accessToken) || !opaque(tokens.idToken) ||
        (tokens.refreshToken !== null && !opaque(tokens.refreshToken)) ||
        !Number.isSafeInteger(tokens.expiresAt) || !Array.isArray(tokens.scopes) ||
        !tokens.scopes.every((scope) => typeof scope === "string")))
    ) throw new AuthFailure("error");
    return record;
  }

  async function saveRecord(record, signal) {
    if (!storageAvailable(safeStorage)) throw new AuthFailure("unavailable");
    signal?.throwIfAborted();
    const ciphertext = safeStorage.encryptString(JSON.stringify(record));
    if (!Buffer.isBuffer(ciphertext) || !ciphertext.length || ciphertext.length > MAX_FILE_BYTES) {
      throw new AuthFailure("error");
    }
    await replaceFile(recordPath, ciphertext, {
      mode: 0o600,
      beforeRename: () => signal?.throwIfAborted(),
    });
  }

  async function hasSession() {
    const epoch = shared.epoch;
    if (shared.disconnect || shared.disabled) return false;
    try {
      const record = await readRecord();
      return epoch === shared.epoch && usable(record);
    } catch {
      return false;
    }
  }

  async function signIn({ signal } = {}) {
    if (signal?.aborted) return result("cancelled");
    if (shared.signIn || shared.disconnect || !openExternal || !fetch) return result("unavailable");
    const controller = new AbortController();
    const cancel = () => controller.abort();
    shared.signIn = controller;
    signal?.addEventListener("abort", cancel, { once: true });
    try {
      return await withDeadline(SIGN_IN_MS, controller.signal, async (attempt) => {
        const { hostId, registration } = await abortable(serialize(async () => {
          attempt.throwIfAborted();
          const registration = await readRecord();
          return { hostId: await getHostId(attempt), registration };
        }), attempt);
        let clientId = registration?.clientId;
        const exchange = async () => {
          const returned = await authorize({ hostId, registration, clientId, openExternal, signal: attempt });
          clientId = returned.clientId;
          const data = await providerRequest(fetch, TOKEN, {
            grant_type: "authorization_code",
            client_id: clientId,
            code: returned.code,
            code_verifier: returned.verifier,
            redirect_uri: returned.redirectUri,
            resource: RESOURCE,
          }, attempt);
          return { returned, data, receivedAt: Date.now() };
        };
        const { returned, data, receivedAt } = await exchange().catch((error) => {
          if (error instanceof AuthFailure && error.code === "invalid_grant") return exchange();
          throw error;
        });
        const tokens = readTokens(data, receivedAt);
        const identity = await verifyIdentity(tokens.idToken, returned, tokens.accessToken, fetch, attempt);
        if (registration && registration.subject !== identity.subject) throw new AuthFailure("auth");
        const granted = planGranted(tokens);
        await serialize(async () => {
          await saveRecord({ ...identity, issuer: ISSUER, clientId, tokens, needsConsent: !granted }, attempt);
          shared.disabled = false;
        });
        return result(granted ? "ok" : "auth");
      });
    } catch (error) {
      return result(controller.signal.aborted ? "cancelled" : error instanceof AuthFailure ? error.status : "error");
    } finally {
      shared.signIn = null;
      signal?.removeEventListener("abort", cancel);
    }
  }

  async function refreshAccess(signal) {
    signal.throwIfAborted();
    const record = await readRecord();
    signal.throwIfAborted();
    if (!planGranted(record?.tokens)) return null;
    const { tokens, clientId } = record;
    const currentToken = () => tokens.expiresAt > Date.now() ? tokens.accessToken : null;
    if (!tokens.refreshToken || tokens.expiresAt > Date.now() + REFRESH_MARGIN_MS) return currentToken();
    let data;
    try {
      data = await providerRequest(fetch, TOKEN, {
        grant_type: "refresh_token",
        client_id: clientId,
        refresh_token: tokens.refreshToken,
        resource: RESOURCE,
      }, signal);
    } catch (error) {
      signal.throwIfAborted();
      if (!TERMINAL_REFRESH_ERRORS.has(error.code) || !(error instanceof AuthFailure)) return currentToken();
      try {
        await saveRecord({ ...record, tokens: null }, signal);
      } catch (error) {
        shared.disabled = true;
        throw error;
      }
      return null;
    }
    const updated = readTokens(data, Date.now(), tokens);
    const granted = planGranted(updated);
    await saveRecord({ ...record, tokens: updated, needsConsent: !granted }, signal);
    return granted && updated.expiresAt > Date.now() ? updated.accessToken : null;
  }

  async function accessToken(signal) {
    if (signal?.aborted || shared.disconnect || shared.disabled) return null;
    const epoch = shared.epoch;
    if (!shared.access) {
      const controller = new AbortController();
      const promise = serialize(() => refreshAccess(controller.signal)).catch(() => null).finally(() => {
        shared.access = null;
      });
      shared.access = { controller, promise };
    }
    try {
      const token = await abortable(shared.access.promise, signal);
      return epoch === shared.epoch && !signal?.aborted ? token : null;
    } catch {
      return null;
    }
  }

  function disconnect() {
    if (shared.disconnect) return shared.disconnect;
    shared.epoch += 1;
    shared.disabled = true;
    shared.signIn?.abort();
    shared.access?.controller.abort();
    shared.disconnect = serialize(async () => {
      try {
        const record = await readRecord().catch(() => null);
        if (record?.tokens?.refreshToken) {
          // Best-effort remote revocation; local tokens are cleared regardless.
          await providerRequest(fetch, REVOKE, {
            token: record.tokens.refreshToken,
            token_type_hint: "refresh_token",
            client_id: record.clientId,
          }).catch(() => {});
        }
        if (record?.tokens) await saveRecord({ ...record, tokens: null });
        else if (!record) await rm(recordPath, { force: true });
        shared.disabled = false;
        return result("ok");
      } catch {
        return result("error");
      }
    }).finally(() => { shared.disconnect = null; });
    return shared.disconnect;
  }

  return { hasSession, signIn, accessToken, disconnect };
}

module.exports = { createChatGptAuth };
