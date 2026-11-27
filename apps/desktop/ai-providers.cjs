const { createHash } = require("node:crypto");
const { readFile } = require("node:fs/promises");
const { join } = require("node:path");
const { replaceFile } = require("./atomic-file.cjs");

const defaults = {
  provider: "ollama",
  endpoint: "http://127.0.0.1:11434",
  enabled: false,
  model: "",
};
const prompt = "Reply with a short greeting to confirm the connection.";
const maxBody = 2 * 1024 * 1024;
const status = (value) => ({ status: value });
const ok = (value) => ({ status: "ok", ...value });
class ProviderError extends Error {}

function targetOf(input) {
  if (!input || !["ollama", "lm-studio", "hosted"].includes(input.provider))
    return;
  const { provider, endpoint } = input;
  if (
    typeof endpoint !== "string" ||
    endpoint.length > 2048 ||
    /[\\\s?#]/.test(endpoint.trim())
  )
    return;
  let url;
  try {
    url = new URL(endpoint.trim());
  } catch {
    return;
  }
  if (url.username || url.password) return;
  if (provider === "hosted") {
    if (url.protocol !== "https:") return;
  } else {
    if (
      !["http:", "https:"].includes(url.protocol) ||
      !["127.0.0.1", "[::1]", "localhost"].includes(url.hostname) ||
      url.pathname !== "/"
    )
      return;
    if (url.hostname === "localhost") url.hostname = "127.0.0.1";
  }
  return { provider, endpoint: url.href.replace(/\/+$/, "") };
}

function validModel(model) {
  return (
    typeof model === "string" &&
    model.length <= 256 &&
    !/[\x00-\x1f\x7f]/.test(model)
  );
}

function cloud(model, id) {
  return (
    /(?:^|[-:/])cloud(?:$|[-:/])/i.test(id) ||
    [model, model.details, model.model_info].some(
      (item) =>
        item &&
        (item.remote_model ||
          item.remote_host ||
          item.remoteModel ||
          item.remoteHost ||
          item.cloud),
    )
  );
}

async function* decoded(body) {
  if (!body) throw new ProviderError("error");
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBody) throw new ProviderError("error");
      yield decoder.decode(value, { stream: true });
    }
    yield decoder.decode();
  } finally {
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

async function json(response) {
  let text = "";
  for await (const chunk of decoded(response.body)) text += chunk;
  return JSON.parse(text);
}

async function* frames(body, ollama) {
  let buffer = "";
  let data = [];
  for await (const chunk of decoded(body)) {
    buffer += chunk;
    let end;
    while ((end = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, end).replace(/\r$/, "");
      buffer = buffer.slice(end + 1);
      if (ollama) {
        if (line.trim()) yield line;
      } else if (line.startsWith("data:")) {
        data.push(line.slice(5).replace(/^ /, ""));
      } else if (!line && data.length) {
        yield data.join("\n");
        data = [];
      }
    }
  }
  if (ollama && buffer.trim()) yield buffer;
}

function createAiProviders({
  userData,
  safeStorage,
  fetch: fetchRequest = fetch,
}) {
  const path = join(userData, "ai-settings.json");
  let pending = Promise.resolve();

  function keyId(target) {
    return createHash("sha256")
      .update(`${target.provider}\n${target.endpoint}`)
      .digest("hex");
  }

  async function load() {
    try {
      return JSON.parse(await readFile(path, "utf8"));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      return { settings: defaults, keys: {} };
    }
  }

  const publicSettings = (settings, keys) => ({
    ...settings,
    hasApiKey: Boolean(keys[keyId(settings)]),
  });

  async function getSettings() {
    await pending;
    const { settings, keys } = await load();
    return ok({ settings: publicSettings(settings, keys) });
  }

  function saveSettings(input) {
    const target = targetOf(input);
    if (
      !target ||
      typeof input.enabled !== "boolean" ||
      !validModel(input.model)
    )
      return status("invalid");
    const { apiKey } = input;
    if (
      apiKey !== undefined &&
      (target.provider !== "hosted" ||
        (apiKey !== null &&
          (typeof apiKey !== "string" ||
            !/^[\x21-\x7e]{1,4096}$/.test(apiKey))))
    )
      return status("invalid");
    const work = pending.then(async () => {
      const { keys } = await load();
      const id = keyId(target);
      if (apiKey === null) delete keys[id];
      else if (apiKey !== undefined) {
        if (!safeStorage.isEncryptionAvailable()) return status("error");
        keys[id] = safeStorage.encryptString(apiKey).toString("base64");
      }
      const settings = {
        ...target,
        enabled: input.enabled,
        model: input.model,
      };
      await replaceFile(path, JSON.stringify({ settings, keys }), {
        mode: 0o600,
      });
      return ok({ settings: publicSettings(settings, keys) });
    });
    pending = work.catch(() => {});
    return work.catch(() => status("error"));
  }

  async function run(input, options, timeoutMs, operation) {
    const target = targetOf(input);
    if (!target) return status("invalid");
    const timeout = AbortSignal.timeout(timeoutMs);
    const signal = options.signal
      ? AbortSignal.any([timeout, options.signal])
      : timeout;
    try {
      const { keys, settings } = await load();
      if (
        !settings.enabled ||
        settings.provider !== target.provider ||
        settings.endpoint !== target.endpoint
      )
        return status("invalid");
      let key;
      if (target.provider === "hosted") {
        const stored = keys[keyId(target)];
        if (!stored) return status("auth");
        if (!safeStorage.isEncryptionAvailable()) return status("error");
        key = safeStorage.decryptString(Buffer.from(stored, "base64"));
      }
      const request = async (route, payload) => {
        let response;
        try {
          response = await fetchRequest(target.endpoint + route, {
            signal,
            redirect: "manual",
            method: payload ? "POST" : "GET",
            headers: {
              ...(payload ? { "Content-Type": "application/json" } : {}),
              ...(key ? { Authorization: `Bearer ${key}` } : {}),
            },
            body: payload ? JSON.stringify(payload) : undefined,
          });
        } catch {
          throw new ProviderError("unavailable");
        }
        if (!response.ok) {
          void response.body?.cancel().catch(() => {});
          throw new ProviderError(
            [401, 403].includes(response.status) ? "auth" : "error",
          );
        }
        return response;
      };
      return await operation(target.provider, request);
    } catch (error) {
      return status(
        options.signal?.aborted
          ? "cancelled"
          : timeout.aborted
            ? "timeout"
            : error instanceof ProviderError
              ? error.message
              : "error",
      );
    }
  }

  async function modelsFor(provider, request) {
    const route =
      provider === "ollama"
        ? "/api/tags"
        : provider === "lm-studio"
          ? "/api/v1/models"
          : "/models";
    const data = await json(await request(route));
    const entries = provider === "hosted" ? data.data : data.models;
    if (!Array.isArray(entries)) throw new ProviderError("error");
    const result = new Map();
    for (const item of entries) {
      if (!item || typeof item !== "object") continue;
      const id =
        provider === "ollama"
          ? (item.model ?? item.name)
          : provider === "lm-studio"
            ? item.key
            : item.id;
      if (!id || !validModel(id)) continue;
      if (
        provider === "ollama" &&
        (cloud(item, id) ||
          (Array.isArray(item.capabilities) &&
            !item.capabilities.includes("completion")))
      )
        continue;
      if (
        provider === "lm-studio" &&
        (item.type !== "llm" || !(item.size_bytes > 0) || cloud(item, id))
      )
        continue;
      const label = item.display_name;
      result.set(id, { id, label: label && validModel(label) ? label : id });
    }
    return [...result.values()];
  }

  function listModels(input, options = {}) {
    return run(input, options, 10000, async (provider, request) => {
      const models = await modelsFor(provider, request);
      return models.length ? ok({ models }) : status("empty");
    });
  }

  function testConnection(input, options = {}) {
    if (!input?.model || !validModel(input.model)) return status("invalid");
    const { model } = input;
    return run(input, options, 60000, async (provider, request) => {
      const ollama = provider === "ollama";
      if (provider !== "hosted") {
        const models = await modelsFor(provider, request);
        if (!models.length) return status("empty");
        if (!models.some(({ id }) => id === model)) return status("invalid");
      }
      if (ollama) {
        const info = await json(await request("/api/show", { model }));
        if (
          cloud(info, model) ||
          !Array.isArray(info.capabilities) ||
          !info.capabilities.includes("completion")
        )
          return status("invalid");
      }
      const route = ollama
        ? "/api/chat"
        : provider === "lm-studio"
          ? "/v1/chat/completions"
          : "/chat/completions";
      const response = await request(route, {
        model,
        messages: [{ role: "user", content: prompt }],
        stream: true,
        ...(ollama ? { options: { num_predict: 64 } } : { max_tokens: 64 }),
      });
      let text = "";
      let finished = false;
      for await (const frame of frames(response.body, ollama)) {
        if (!ollama && frame === "[DONE]") {
          finished = true;
          break;
        }
        const packet = JSON.parse(frame);
        if (packet.error) return status("error");
        const chunk = ollama
          ? packet.message?.content
          : packet.choices?.[0]?.delta?.content;
        if (typeof chunk === "string" && chunk.length) {
          if (text.length + chunk.length > 8192) return status("error");
          text += chunk;
          options.onChunk?.(chunk);
        }
        if (ollama && packet.done === true) {
          finished = true;
          break;
        }
      }
      return text.trim() && finished ? ok({ text }) : status("error");
    });
  }
  return { getSettings, saveSettings, listModels, testConnection };
}

module.exports = { createAiProviders };
