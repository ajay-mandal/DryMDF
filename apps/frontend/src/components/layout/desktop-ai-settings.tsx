"use client";

import { useEffect, useRef, useState } from "react";
import { Cpu } from "lucide-react";
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
  hosted: {
    label: "Hosted (OpenAI-compatible)",
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
type Operation = "save" | "list" | "test";

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
  const hosted = draft.provider === "hosted";
  const endpointChanged =
    draft.provider !== saved.provider || draft.endpoint !== saved.endpoint;
  const hasSavedKey = hosted && !endpointChanged && saved.hasApiKey;
  const canDiscover =
    draft.enabled &&
    saved.enabled &&
    !endpointChanged &&
    (!hosted || (hasSavedKey && !hasNewKey));
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

  async function save(removeKey = false) {
    setBusy("save");
    setStatus("Saving settings…");
    const { enabled, provider, endpoint, model } = draft;
    const apiKey = hosted ? keyInput.current?.value.trim() : undefined;
    try {
      const result = await bridge.saveAiSettings({
        enabled,
        provider,
        endpoint,
        model,
        ...(removeKey ? { apiKey: null } : apiKey ? { apiKey } : {}),
      });
      if (result.status !== "ok") {
        setStatus(errors[result.status]);
        return;
      }
      setDraft(result.settings);
      setSaved(result.settings);
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
    } catch {
      setStatus(errors.error);
    } finally {
      setBusy(undefined);
    }
  }

  async function run(operation: "list" | "test") {
    const id = crypto.randomUUID();
    request.current = id;
    setBusy(operation);
    setResponse("");
    setStatus(
      operation === "list"
        ? "Looking for chat models…"
        : "Waiting for the model…",
    );
    const target = { provider: draft.provider, endpoint: draft.endpoint };
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
          setStatus(errors[result.status]);
        }
      } else {
        const result = await bridge.testAiConnection(
          id,
          { ...target, model: draft.model },
          (chunk) => {
            if (request.current === id) setResponse((value) => value + chunk);
          },
        );
        if (request.current !== id) return;
        if (result.status === "ok") setResponse(result.text);
        setStatus(
          result.status === "ok"
            ? "Connection verified."
            : errors[result.status],
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
            setDraft({ ...draft, enabled: event.target.checked });
            setResponse("");
            setStatus("");
          }}
        />
      </label>
      <fieldset className="mac-ai-fields" disabled={!draft.enabled || !!busy}>
        <label className="mac-setting">
          <span>
            Provider
            <small>
              {hosted
                ? "Runs on the provider’s servers."
                : "Runs on this Mac with downloaded models."}
            </small>
          </span>
          <select
            value={draft.provider}
            onChange={(event) => {
              const provider = event.target.value as AiProvider;
              changeTarget(
                provider,
                provider === saved.provider
                  ? saved.endpoint
                  : providers[provider].endpoint,
              );
            }}
          >
            {Object.entries(providers).map(([id, provider]) => (
              <option key={id} value={id}>
                {provider.label}
              </option>
            ))}
          </select>
        </label>
        <label className="mac-setting">
          <span>
            Endpoint
            <small>
              {hosted
                ? "HTTPS API base URL, usually ending in /v1."
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
              <input
                ref={keyInput}
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
        <label className="mac-setting">
          <span>Model</span>
          <select
            value={draft.model}
            disabled={!canDiscover}
            onChange={(event) => {
              setDraft({ ...draft, model: event.target.value });
              setResponse("");
              setStatus("");
            }}
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
        </label>
        <div className="mac-ai-actions">
          <Button
            type="button"
            variant="outline"
            disabled={!canDiscover}
            onClick={() => void run("list")}
          >
            {models.length ? "Refresh Models" : "Find Models"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!canDiscover || !draft.model}
            onClick={() => void run("test")}
          >
            Test Connection
          </Button>
        </div>
      </fieldset>
      <p className="mac-settings-status">
        The connection test sends a preset message, never your document. Save
        the endpoint and any key before looking for models.
      </p>
      <div className="mac-ai-actions">
        <Button type="submit" disabled={!!busy || !dirty}>
          Save AI Settings
        </Button>
        {(busy === "list" || busy === "test") && (
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
