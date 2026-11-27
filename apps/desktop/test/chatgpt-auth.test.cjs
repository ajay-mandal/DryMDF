const assert = require("node:assert/strict");
const { generateKeyPairSync, createSign } = require("node:crypto");
const { mkdtemp, readFile, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const test = require("node:test");
const { createChatGptAuth } = require("../chatgpt-auth.cjs");

const ISSUER = "https://auth.openai.com";
const PLAN_SCOPE = "chatgpt.tokens.use.direct";

// A stable RSA key pair so the JWKS and signed ID tokens agree.
const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = publicKey.export({ format: "jwk" });
const KID = "test-kid";

function b64url(value) {
  return Buffer.from(value).toString("base64url");
}

function signIdToken({ clientId, nonce, sub = "user-1", email, atHash, exp, iat, iss = ISSUER, aud }) {
  const header = { alg: "RS256", kid: KID, typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss,
    aud: aud ?? clientId,
    sub,
    nonce,
    iat: iat ?? now,
    exp: exp ?? now + 3600,
  };
  if (email) payload.email = email;
  if (atHash) payload.at_hash = atHash;
  const encodedHeader = b64url(JSON.stringify(header));
  const encodedPayload = b64url(JSON.stringify(payload));
  const signature = createSign("RSA-SHA256")
    .update(`${encodedHeader}.${encodedPayload}`)
    .sign(privateKey, "base64url");
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function fakeSafeStorage() {
  return {
    isEncryptionAvailable: () => true,
    getSelectedStorageBackend: () => "keychain",
    encryptString: (value) => Buffer.from(`enc:${Buffer.from(value).toString("base64")}`),
    decryptString: (value) => Buffer.from(value.toString().replace(/^enc:/, ""), "base64").toString(),
  };
}

async function fixture(t, { fetch, openExternal } = {}) {
  const userData = await mkdtemp(join(tmpdir(), "drymdf-chatgpt-"));
  t.after(() => rm(userData, { recursive: true, force: true }));
  const auth = createChatGptAuth({
    userData,
    safeStorage: fakeSafeStorage(),
    openExternal: openExternal ?? (() => Promise.resolve()),
    fetch: fetch ?? (() => { throw new Error("unexpected fetch"); }),
  });
  return { userData, auth };
}

// A fetch that serves the JWKS and token endpoint, and drives the loopback
// callback by parsing the authorize URL that openExternal receives.
function provider({ clientId = "oaiapp_test123", sub = "user-1", grantPlan = true, refresh = true } = {}) {
  const state = { authorizeUrl: null, tokenCalls: 0, revokeCalls: 0 };
  const fetch = async (url, options = {}) => {
    const href = String(url);
    if (href.endsWith("/.well-known/jwks.json")) {
      return Response.json({ keys: [{ ...jwk, kid: KID, alg: "RS256", use: "sig" }] });
    }
    if (href.endsWith("/api/accounts/oauth/token")) {
      state.tokenCalls++;
      const body = new URLSearchParams(options.body);
      const grant = body.get("grant_type");
      const scopes = grantPlan
        ? `openid profile email offline_access resource.invoke ${PLAN_SCOPE}`
        : "openid profile email";
      const accessToken = `access-${state.tokenCalls}`;
      const idToken = signIdToken({
        clientId: body.get("client_id"),
        nonce: state.nonce,
        sub,
        email: "user@example.com",
        atHash: b64url(require("node:crypto").createHash("sha256").update(accessToken).digest().subarray(0, 16)),
      });
      return Response.json({
        access_token: accessToken,
        token_type: "bearer",
        expires_in: 3600,
        scope: scopes,
        id_token: idToken,
        refresh_token: refresh ? `refresh-${state.tokenCalls}` : undefined,
      });
    }
    if (href.endsWith("/api/accounts/oauth/revoke")) {
      state.revokeCalls++;
      return new Response(null, { status: 200 });
    }
    throw new Error(`unexpected fetch: ${href}`);
  };
  const openExternal = async (url) => {
    state.authorizeUrl = new URL(url);
    state.nonce = state.authorizeUrl.searchParams.get("nonce");
    // Simulate the browser redirecting back to the loopback callback by
    // making a real HTTP request to the callback URL the module is serving.
    const redirect = state.authorizeUrl.searchParams.get("redirect_uri");
    const code = "auth-code-123";
    const issued = state.authorizeUrl.searchParams.get("client_id") === "dynamic_agent_client"
      ? clientId
      : state.authorizeUrl.searchParams.get("client_id");
    const callback = new URL(redirect);
    callback.searchParams.set("code", code);
    callback.searchParams.set("state", state.authorizeUrl.searchParams.get("state"));
    callback.searchParams.set("client_id", issued);
    const response = await globalThis.fetch(callback.toString());
    assert.equal(response.status, 200);
  };
  return { state, fetch, openExternal };
}

test("sign-in completes the OSS flow, validates the ID token, and stores an encrypted session", async (t) => {
  const { state, fetch, openExternal } = provider();
  const { userData, auth } = await fixture(t, { fetch, openExternal });

  assert.equal(await auth.hasSession(), false);
  assert.deepEqual(await auth.signIn(), { status: "ok" });
  assert.equal(await auth.hasSession(), true);

  // The authorize URL used dynamic registration and the OSS scopes.
  assert.equal(state.authorizeUrl.searchParams.get("client_id"), "dynamic_agent_client");
  assert.equal(state.authorizeUrl.searchParams.get("agent_name_hint"), "DryMDF");
  assert.equal(state.authorizeUrl.searchParams.get("scope").includes(PLAN_SCOPE), true);
  assert.equal(state.authorizeUrl.searchParams.get("code_challenge_method"), "S256");

  // The credential file is encrypted and never contains the raw token.
  const record = await readFile(join(userData, "chatgpt-credentials.enc"), "utf8");
  assert.match(record, /^enc:/);
  assert.doesNotMatch(record, /access-1/);

  // The access token is retrievable and stable within its lifetime.
  assert.equal(await auth.accessToken(), "access-1");
});

test("sign-in without ChatGPT plan scope returns auth and stores no usable session", async (t) => {
  const { fetch, openExternal } = provider({ grantPlan: false });
  const { auth } = await fixture(t, { fetch, openExternal });
  assert.deepEqual(await auth.signIn(), { status: "auth" });
  assert.equal(await auth.hasSession(), false);
  assert.equal(await auth.accessToken(), null);
});

test("a mismatched ID-token subject on reauthorization is rejected", async (t) => {
  const first = provider({ sub: "user-1" });
  const { userData, auth } = await fixture(t, { fetch: first.fetch, openExternal: first.openExternal });
  assert.deepEqual(await auth.signIn(), { status: "ok" });

  // Reauthorize with a different subject using the same client and userData.
  const second = provider({ sub: "user-2", clientId: "oaiapp_test123" });
  const auth2 = createChatGptAuth({
    userData,
    safeStorage: fakeSafeStorage(),
    openExternal: second.openExternal,
    fetch: second.fetch,
  });
  assert.deepEqual(await auth2.signIn(), { status: "auth" });
});

test("disconnect revokes the refresh token and clears the local session", async (t) => {
  const { state, fetch, openExternal } = provider({ refresh: true });
  const { auth } = await fixture(t, { fetch, openExternal });
  assert.deepEqual(await auth.signIn(), { status: "ok" });
  assert.deepEqual(await auth.disconnect(), { status: "ok" });
  assert.equal(state.revokeCalls, 1);
  assert.equal(await auth.hasSession(), false);
  assert.equal(await auth.accessToken(), null);
});

test("sign-in cancellation aborts cleanly", async (t) => {
  let resolveOpen;
  const openExternal = () => new Promise((resolve) => { resolveOpen = resolve; });
  const { auth } = await fixture(t, { openExternal });
  const controller = new AbortController();
  const pending = auth.signIn({ signal: controller.signal });
  // Wait until openExternal is called, then cancel.
  await new Promise((resolve) => setTimeout(resolve, 20));
  controller.abort();
  resolveOpen();
  assert.deepEqual(await pending, { status: "cancelled" });
  assert.equal(await auth.hasSession(), false);
});
