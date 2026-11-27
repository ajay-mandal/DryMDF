"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Cpu, KeyRound, Laptop, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  AiFailure,
  AiProvider,
  AiSettings,
  DesktopAiBridge,
} from "@/types/desktop-ai";

const providers = {
  ollama: { label: "Ollama", endpoint: "http://127.0.0.1:11434" },
  "lm-studio": { label: "LM Studio", endpoint: "http://127.0.0.1:1234" },
  chatgpt: {
    label: "ChatGPT (account sign-in)",
    endpoint: "https://api.openai.com/v1",
  },
  hosted: {
    label: "OpenAI-compatible",
    endpoint: "https://api.openai.com/v1",
  },
} satisfies Record<AiProvider, { label: string; endpoint: string }>;

const errors: Record<AiFailure["status"], string> = {
  invalid:
    "Check the endpoint and model. Local providers require a loopback address; hosted providers require HTTPS.",
  unavailable:
    "Server unavailable. Start or restart the provider, then try again.",
  empty:
    "No chat models found. Download a local chat model or check model access with your hosted provider.",
  auth: "Authentication failed. Check the provider’s access settings or save a valid API key for this endpoint.",
  timeout: "The provider took too long to respond. Try again.",
  cancelled: "Request stopped.",
  error:
    "The provider operation did not complete. Check the settings and try again.",
};

type Model = { id: string; label: string };
type Operation = "save" | "list" | "test" | "sign-in" | "disconnect";

export function DesktopAiSettings() {
  const bridge = window.drymdfDesktop;
  const [settings, setSettings] = useState<AiSettings>();
  const [status, setStatus] = useState("Loading AI settings…");
  const [loadVersion, setLoadVersion] = useState(0);

  useEffect(() => {
    let current = true;
    async function load() {
      try {
        const result = await bridge?.getAiSettings();
        if (!current) return;
        if (result?.status === "ok") setSettings(result.settings);
        else setStatus("Couldn’t load AI settings.");
      } catch {
        if (current) setStatus("Couldn’t load AI settings.");
      }
    }
    void load();
    return () => {
      current = false;
    };
  }, [bridge, loadVersion]);

  return (
    <section className="mac-settings-group" aria-labelledby="mac-ai-title">
      <h2 id="mac-ai-title">
        <Cpu /> AI providers
      </h2>
      {bridge && settings ? (
        <ProviderForm bridge={bridge} initial={settings} />
      ) : (
        <div className="mac-setting">
          <span role="status">{status}</span>
          {status === "Couldn’t load AI settings." && (
            <Button
              variant="outline"
              onClick={() => {
                setStatus("Loading AI settings…");
                setLoadVersion((value) => value + 1);
              }}
            >
              Reload Settings
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

function ProviderForm({
  bridge,
  initial,
}: {
  bridge: DesktopAiBridge;
  initial: AiSettings;
}) {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [models, setModels] = useState<Model[]>([]);
  const [busy, setBusy] = useState<Operation>();
  const [status, setStatus] = useState("");
  const [response, setResponse] = useState("");
  const keyInput = useRef<HTMLInputElement>(null);
  const [hasNewKey, setHasNewKey] = useState(false);
  const request = useRef<string | null>(null);
  const modelListId = useId();
  const hosted = draft.provider === "hosted";
  const chatGpt = draft.provider === "chatgpt";
  const [connected, setConnected] = useState(initial.chatGptConnected);
  const endpointChanged =
    draft.provider !== saved.provider || draft.endpoint !== saved.endpoint;
  const hasSavedKey = hosted && !endpointChanged && saved.hasApiKey;
  const canDiscover =
    draft.enabled &&
    saved.enabled &&
    !endpointChanged &&
    (chatGpt ? connected : !hosted || (hasSavedKey && !hasNewKey));
  const dirty =
    draft.enabled !== saved.enabled ||
    endpointChanged ||
    draft.model !== saved.model ||
    hasNewKey;

  useEffect(
    () => () => {
      const id = request.current;
      request.current = null;
      if (id) void bridge.cancelAiRequest(id).catch(() => {});
    },
    [bridge],
  );

  function changeTarget(provider: AiProvider, endpoint: string) {
    setDraft((value) => ({
      ...value,
      provider,
      endpoint,
      model:
        provider === saved.provider && endpoint === saved.endpoint
          ? saved.model
          : "",
    }));
    if (keyInput.current) keyInput.current.value = "";
    setHasNewKey(false);
    setModels([]);
    setResponse("");
    setStatus("");
  }

  function changeModel(model: string): void {
    setDraft((value) => ({ ...value, model }));
    setResponse("");
    setStatus("");
  }

  async function save(removeKey = false, enabledOverride?: boolean) {
    setBusy("save");
    setStatus("Saving settings…");
    const { provider, endpoint, model } =
      enabledOverride === undefined ? draft : saved;
    const enabled = enabledOverride ?? draft.enabled;
    const apiKey =
      enabledOverride === undefined && hosted
        ? keyInput.current?.value.trim()
        : undefined;
    try {
      const result = await bridge.saveAiSettings({
        enabled,
        provider,
        endpoint,
        model: hosted ? model.trim() : model,
        ...(removeKey ? { apiKey: null } : apiKey ? { apiKey } : {}),
      });
      if (result.status !== "ok") {
        setStatus(errors[result.status]);
        return;
      }
      setDraft(result.settings);
      setSaved(result.settings);
      setConnected(result.settings.chatGptConnected);
      if (keyInput.current) keyInput.current.value = "";
      setHasNewKey(false);
      if (removeKey || !enabled) {
        setModels([]);
        setResponse("");
      }
      setStatus(
        removeKey
          ? "API key removed."
          : enabled
            ? "AI settings saved."
            : "AI is off.",
      );
      return result.settings;
    } catch {
      setStatus(errors.error);
    } finally {
      setBusy(undefined);
    }
  }

  async function changeChatGptSession(disconnect: boolean): Promise<void> {
    const id = crypto.randomUUID();
    request.current = id;
    setBusy(disconnect ? "disconnect" : "sign-in");
    setResponse("");
    setStatus(
      disconnect ? "Disconnecting…" : "Finish signing in in your browser…",
    );
    try {
      const result = disconnect
        ? await bridge.disconnectChatGpt()
        : await bridge.signInChatGpt(id);
      if (request.current !== id) return;
      if (result.status !== "ok") {
        setStatus(
          result.status === "auth"
            ? "ChatGPT sign-in didn’t grant plan access. Try again with an eligible account."
            : errors[result.status],
        );
        return;
      }
      setConnected(result.connected);
      setModels([]);
      changeModel("");
      setStatus(
        result.connected
          ? "ChatGPT connected. Find a model to test it."
          : "ChatGPT disconnected from this Mac.",
      );
    } catch {
      if (request.current === id) setStatus(errors.error);
    } finally {
      if (request.current === id) {
        request.current = null;
        setBusy(undefined);
      }
    }
  }

  function describeFailure(failure: AiFailure): string {
    if (chatGpt && failure.status === "auth") {
      setConnected(false);
      return "ChatGPT access expired or was denied. Sign in again.";
    }
    return errors[failure.status];
  }

  async function run(operation: "list" | "test", config = draft) {
    const id = crypto.randomUUID();
    request.current = id;
    setBusy(operation);
    setResponse("");
    setStatus(
      operation === "list"
        ? "Looking for chat models…"
        : "Waiting for the model…",
    );
    const target = { provider: config.provider, endpoint: config.endpoint };
    try {
      if (operation === "list") {
        const result = await bridge.listAiModels(id, target);
        if (request.current !== id) return;
        if (result.status === "ok") {
          setModels(result.models);
          setStatus(
            `${result.models.length} chat ${result.models.length === 1 ? "model" : "models"} found.`,
          );
        } else {
          setModels([]);
          setStatus(
            hosted && (result.status === "empty" || result.status === "error")
              ? "Couldn’t list models. Enter a model ID from your provider to test the connection."
              : describeFailure(result),
          );
        }
      } else {
        const result = await bridge.testAiConnection(
          id,
          { ...target, model: hosted ? config.model.trim() : config.model },
          (chunk) => {
            if (request.current === id) setResponse((value) => value + chunk);
          },
        );
        if (request.current !== id) return;
        if (result.status === "ok") setResponse(result.text);
        setStatus(
          result.status === "ok"
            ? "Connection verified."
            : describeFailure(result),
        );
      }
    } catch {
      if (request.current === id) setStatus(errors.error);
    } finally {
      if (request.current === id) {
        request.current = null;
        setBusy(undefined);
      }
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!busy && dirty) void save();
      }}
    >
      <label className="mac-setting">
        <span>
          Use AI<small>Editing and export work without AI.</small>
        </span>
        <input
          type="checkbox"
          role="switch"
          checked={draft.enabled}
          disabled={!!busy}
          onChange={(event) => {
            const enabled = event.target.checked;
            setResponse("");
            if (dirty) {
              setDraft({ ...draft, enabled });
              setStatus("Save AI Settings to keep these changes.");
            } else {
              void save(false, enabled);
            }
          }}
        />
      </label>
      <fieldset className="mac-ai-fields" disabled={!draft.enabled || !!busy}>
        <h3 className="mac-ai-step">1 · Choose a provider</h3>
        <div
          className="mac-ai-provider-grid"
          role="group"
          aria-label="Provider"
        >
          {(["chatgpt", "hosted", "ollama", "lm-studio"] as const).map(
            (provider) => {
              const Icon =
                provider === "chatgpt"
                  ? MessageCircle
                  : provider === "hosted"
                    ? KeyRound
                    : Laptop;
              return (
                <button
                  type="button"
                  key={provider}
                  aria-pressed={draft.provider === provider}
                  onClick={() =>
                    changeTarget(
                      provider,
                      provider === saved.provider
                        ? saved.endpoint
                        : providers[provider].endpoint,
                    )
                  }
                >
                  <Icon size={17} aria-hidden="true" />
                  <span>
                    <strong>
                      {provider === "chatgpt"
                        ? "ChatGPT"
                        : providers[provider].label}
                    </strong>
                    <small>
                      {provider === "chatgpt"
                        ? "Browser sign-in · no API key"
                        : provider === "hosted"
                          ? "HTTPS endpoint and API key"
                          : "Local models on this Mac"}
                    </small>
                  </span>
                </button>
              );
            },
          )}
        </div>
        <h3 className="mac-ai-step">2 · Connect your provider</h3>
        {!chatGpt && (
          <label className="mac-setting">
            <span>
              Endpoint
              <small>
                {hosted
                  ? "Enter your provider’s HTTPS API base URL, not its website or full chat endpoint."
                  : "Use a loopback address on this Mac."}
              </small>
            </span>
            <input
              type="text"
              inputMode="url"
              autoCapitalize="none"
              spellCheck={false}
              value={draft.endpoint}
              maxLength={2048}
              onChange={(event) =>
                changeTarget(draft.provider, event.target.value)
              }
            />
          </label>
        )}
        {chatGpt && (
          <div className="mac-setting">
            <span>
              ChatGPT account
              <small>
                {endpointChanged || !saved.enabled
                  ? "Continue to authorize eligible ChatGPT plan usage in your browser."
                  : connected
                    ? "Connected on this Mac."
                    : "Authorize eligible ChatGPT plan usage in your browser. No API key required."}
              </small>
            </span>
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                if (connected && !endpointChanged && saved.enabled) {
                  await changeChatGptSession(true);
                  return;
                }
                const config =
                  endpointChanged || !saved.enabled ? await save() : saved;
                if (!config) return;
                if (config.chatGptConnected) {
                  setStatus(
                    "ChatGPT is already connected. Find a model to test it.",
                  );
                } else {
                  await changeChatGptSession(false);
                }
              }}
            >
              {connected && !endpointChanged
                ? "Disconnect ChatGPT"
                : "Continue with ChatGPT"}
            </Button>
          </div>
        )}
        {hosted && (
          <div className="mac-setting">
            <label>
              <span>
                API key
                <small>
                  {hasSavedKey
                    ? "Saved for this endpoint. Enter a new key to replace it."
                    : "Save a key for this endpoint. Keys are protected by macOS Keychain."}
                </small>
              </span>
              {hasSavedKey && (
                <code
                  className="mac-ai-key-preview"
                  aria-label="Masked saved API key"
                >
                  {saved.apiKeyPreview ?? "******"}
                </code>
              )}
              <input
                ref={keyInput}
                placeholder={
                  hasSavedKey ? "Enter a replacement key" : "Enter your API key"
                }
                type="password"
                autoComplete="off"
                spellCheck={false}
                maxLength={4096}
                onChange={(event) =>
                  setHasNewKey(Boolean(event.target.value.trim()))
                }
              />
            </label>
            {hasSavedKey && (
              <Button
                type="button"
                variant="outline"
                onClick={() => void save(true)}
              >
                Remove Key
              </Button>
            )}
          </div>
        )}
        {!chatGpt && (
          <div className="mac-ai-actions">
            <Button
              type="button"
              disabled={hosted && !hasSavedKey && !hasNewKey}
              onClick={async () => {
                const config = dirty ? await save() : saved;
                if (config) await run("list", config);
              }}
            >
              {canDiscover ? "Refresh Models" : "Save Connection & Find Models"}
            </Button>
          </div>
        )}
        <h3 className="mac-ai-step">3 · Select a model and verify</h3>
        <label className="mac-setting">
          <span>
            {hosted ? "Model ID" : "Model"}
            {hosted && (
              <small>Find models or enter the ID from your provider.</small>
            )}
          </span>
          {hosted ? (
            <>
              <input
                type="text"
                name="model"
                value={draft.model}
                list={models.length ? modelListId : undefined}
                maxLength={256}
                disabled={!canDiscover}
                autoCapitalize="none"
                spellCheck={false}
                onChange={(event) => changeModel(event.target.value)}
              />
              <datalist id={modelListId}>
                {models.map(({ id, label }) => (
                  <option
                    key={id}
                    value={id}
                    label={label === id ? undefined : label}
                  />
                ))}
              </datalist>
            </>
          ) : (
            <select
              value={draft.model}
              disabled={!canDiscover}
              onChange={(event) => changeModel(event.target.value)}
            >
              <option value="">Select a chat model</option>
              {draft.model && !models.some(({ id }) => id === draft.model) && (
                <option value={draft.model}>{draft.model}</option>
              )}
              {models.map(({ id, label }) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          )}
        </label>
        <div className="mac-ai-actions">
          {chatGpt && (
            <Button
              type="button"
              variant="outline"
              disabled={!canDiscover}
              onClick={() => void run("list")}
            >
              {models.length ? "Refresh Models" : "Find Models"}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            disabled={!canDiscover || !draft.model.trim()}
            onClick={async () => {
              const config = dirty ? await save() : saved;
              if (config) await run("test", config);
            }}
          >
            Save Model & Test
          </Button>
        </div>
      </fieldset>
      <p className="mac-settings-status">
        The connection test sends a preset message, never your document.
      </p>
      <div className="mac-ai-actions">
        <Button type="submit" disabled={!!busy || !dirty}>
          Save AI Settings
        </Button>
        {(busy === "list" || busy === "test" || busy === "sign-in") && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (request.current)
                void bridge.cancelAiRequest(request.current).catch(() => {});
            }}
          >
            Stop Request
          </Button>
        )}
      </div>
      {status && (
        <p className="mac-settings-status" role="status">
          {status}
        </p>
      )}
      {response && (
        <p className="mac-ai-response" aria-label="Test response">
          {response}
        </p>
      )}
    </form>
  );
}
