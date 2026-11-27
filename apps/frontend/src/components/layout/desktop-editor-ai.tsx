"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { isolateHistory } from "@codemirror/commands";
import type { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  AiSettings,
  EditorAiAction,
  EditorAiRequest,
} from "@/types/desktop-ai";

type View = NonNullable<ReactCodeMirrorRef["view"]>;
interface Capture {
  view: View;
  doc: View["state"]["doc"];
  from: number;
  to: number;
  original: string;
  input: EditorAiRequest;
  labels: string[];
}
interface Props {
  editor: RefObject<ReactCodeMirrorRef | null>;
  content: string;
  name: string;
  selectionDefault: boolean;
  references: { id: string; name: string; content: string }[];
  onClose: () => void;
  onApply: () => void;
  onSettings: () => void;
}
const actions = {
  ask: "Ask AI",
  proofread: "Fix spelling and grammar",
  style: "Improve style",
  rewrite: "Rewrite with instructions",
} as const;
const providers = {
  ollama: "Ollama",
  "lm-studio": "LM Studio",
  hosted: "OpenAI-compatible",
  chatgpt: "ChatGPT",
} as const;
const failures = {
  invalid:
    "The request or AI settings changed. Review your settings and try again.",
  unavailable:
    "The provider is unavailable. Check the connection and try again.",
  auth: "The provider could not authenticate. Check your AI provider settings.",
  timeout: "The provider took too long to respond.",
  empty: "The provider returned no usable text.",
  cancelled: "Request stopped.",
  error:
    "The response could not be completed. Try a smaller selection or retry.",
};

export function DesktopEditorAi({
  editor,
  content,
  name,
  selectionDefault,
  references,
  onClose,
  onApply,
  onSettings,
}: Props) {
  const [config, setConfig] = useState<AiSettings | null | undefined>(
    undefined,
  );
  const [scope, setScope] = useState(
    selectionDefault ? "selection" : "document",
  );
  const [action, setAction] = useState<EditorAiAction>("ask");
  const [prompt, setPrompt] = useState("");
  const [included, setIncluded] = useState<string[]>([]);
  const [review, setReview] = useState<Capture | null>(null);
  const [suggestion, setSuggestion] = useState<Capture | null>(null);
  const [reply, setReply] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(false);
  const active = useRef<string | null>(null);
  const bridge = window.drymdfDesktop;
  useEffect(() => {
    let live = true;
    const unsubscribe = bridge?.onAiChunk?.((id, chunk) => {
      if (active.current === id) setReply((previous) => previous + chunk);
    });
    void bridge
      ?.getAiSettings()
      .then((result) => {
        if (live) setConfig(result.status === "ok" ? result.settings : null);
      })
      .catch(() => {
        if (live) setConfig(null);
      });
    return () => {
      live = false;
      unsubscribe?.();
      const request = active.current;
      active.current = null;
      if (request) void bridge?.cancelAiRequest(request).catch(() => {});
    };
  }, [bridge]);

  const hosted =
    config?.provider === "hosted" || config?.provider === "chatgpt";
  const ready = config?.enabled && config.model && bridge?.runEditorAi;
  const isCurrent = (capture: Capture) =>
    editor.current?.view === capture.view &&
    capture.view.state.doc === capture.doc;
  const stale = suggestion && suggestion.doc.toString() !== content;

  async function send(capture: Capture, confirmed: boolean) {
    setReview(null);
    if (!bridge || active.current) return;
    if (!isCurrent(capture)) {
      setMessage(
        "The draft changed. Review a new request with the current text.",
      );
      return;
    }
    const id = crypto.randomUUID();
    active.current = id;
    setBusy(true);
    setReply("");
    setSuggestion(null);
    setRetry(false);
    setMessage("");
    try {
      const result = await bridge.runEditorAi(id, {
        ...capture.input,
        hostedConfirmed: confirmed,
      });
      if (active.current !== id) return;
      if (result.status !== "ok") {
        setReply("");
        setMessage(failures[result.status]);
        setRetry(true);
      } else {
        setReply(result.text);
        if (capture.input.action !== "ask") setSuggestion(capture);
      }
    } catch {
      if (active.current === id) {
        setReply("");
        setMessage(failures.error);
        setRetry(true);
      }
    } finally {
      if (active.current === id) {
        active.current = null;
        setBusy(false);
      }
    }
  }

  function prepare() {
    const view = editor.current?.view;
    if (!config || !ready || !view || busy || active.current) return;
    const doc = view.state.doc;
    const range = view.state.selection.main;
    const from = scope === "selection" ? range.from : 0;
    const to = scope === "selection" ? range.to : doc.length;
    const original = doc.sliceString(from, to);
    if (!original.trim()) {
      setMessage(
        scope === "selection"
          ? "Select some text in the editor first."
          : "The document is empty.",
      );
      return;
    }
    const extra = references.filter((file) => included.includes(file.id));
    const context: EditorAiRequest["context"] = [
      {
        kind: scope === "selection" ? "selection" : "document",
        text: original,
      },
      ...extra.map((file) => ({
        kind: "reference" as const,
        text: file.content,
      })),
    ];
    if (
      context.length > 12 ||
      context.reduce(
        (size, part) => size + part.text.length,
        prompt.trim().length,
      ) > 100000
    ) {
      setMessage(
        "Select a smaller section or remove reference files. Each request allows 100,000 characters across up to 12 items.",
      );
      return;
    }
    const capture: Capture = {
      view,
      doc,
      from,
      to,
      original,
      input: {
        provider: config.provider,
        endpoint: config.endpoint,
        model: config.model,
        action,
        prompt: prompt.trim(),
        context,
        hostedConfirmed: false,
      },
      labels: [
        scope === "selection" ? `Selection from ${name}` : name,
        ...extra.map((file) => file.name),
      ],
    };
    if (hosted) setReview(capture);
    else void send(capture, false);
  }

  function stop() {
    const id = active.current;
    if (!id) return;
    active.current = null;
    void bridge?.cancelAiRequest(id).catch(() => {});
    setBusy(false);
    setReply("");
    setMessage(failures.cancelled);
    setRetry(true);
  }

  function apply() {
    if (!suggestion || !isCurrent(suggestion) || stale) {
      setMessage(
        "This suggestion is out of date. Generate a new one from the current draft.",
      );
      return;
    }
    const { view, from, to } = suggestion;
    view.dispatch({
      changes: { from, to, insert: reply },
      userEvent: "input.complete",
      annotations: isolateHistory.of("full"),
    });
    onApply();
  }

  return (
    <section className="mac-ai-pane" aria-label="Writing assistant">
      <header className="flex items-start justify-between gap-2">
        <div>
          <h2>Writing assistant</h2>
          <p>
            {config
              ? `${providers[config.provider]} · ${config.model || "No model selected"}`
              : "Work with your Markdown draft"}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Back to Preview
        </Button>
      </header>
      {config === undefined ? (
        <p role="status">Loading AI settings…</p>
      ) : !ready ? (
        <div className="space-y-2">
          <p>Enable AI and save a model in Settings to get started.</p>
          <Button variant="outline" onClick={onSettings}>
            Open Settings
          </Button>
        </div>
      ) : (
        <form
          className="mac-ai-form"
          onSubmit={(event) => {
            event.preventDefault();
            prepare();
          }}
        >
          <fieldset disabled={busy} className="min-w-0 space-y-3">
            <label>
              Action
              <select
                value={action}
                onChange={(event) =>
                  setAction(event.target.value as EditorAiAction)
                }
              >
                {Object.entries(actions).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Use text from
              <select
                value={scope}
                onChange={(event) => setScope(event.target.value)}
              >
                <option value="selection">Current selection</option>
                <option value="document">Entire document</option>
              </select>
            </label>
            {references.length > 0 && (
              <details>
                <summary>Add workspace references ({included.length})</summary>
                <div className="mac-ai-references">
                  {references.map((file) => (
                    <label key={file.id} className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={included.includes(file.id)}
                        onChange={(event) =>
                          setIncluded(
                            event.target.checked
                              ? [...included, file.id]
                              : included.filter((id) => id !== file.id),
                          )
                        }
                      />
                      {file.name}
                    </label>
                  ))}
                </div>
              </details>
            )}
            <label>
              {action === "ask" ? "Question" : "Editing instructions"}
              <textarea
                rows={3}
                value={prompt}
                maxLength={4000}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={
                  action === "ask"
                    ? "What could make this clearer?"
                    : "For example: use a more direct tone"
                }
              />
            </label>
          </fieldset>
          <p>
            {hosted
              ? "You’ll review the text before sending it to the provider."
              : "Your request goes to the provider running on this Mac."}
          </p>
          {busy ? (
            <Button type="button" variant="outline" onClick={stop}>
              Stop response
            </Button>
          ) : (
            <Button
              className="mac-primary"
              type="submit"
              disabled={
                ((action === "ask" || action === "rewrite") &&
                  !prompt.trim()) ||
                !!suggestion
              }
            >
              {retry
                ? "Retry request"
                : action === "ask"
                  ? "Send question"
                  : "Suggest edit"}
            </Button>
          )}
        </form>
      )}
      {busy && <p role="status">Generating response…</p>}
      {message && <p role="status">{message}</p>}
      {suggestion ? (
        <section className="space-y-3" aria-label="Review suggested edit">
          <h3>Review suggested edit</h3>
          <div className="mac-ai-comparison">
            <div>
              <h4>Original</h4>
              <pre>{suggestion.original}</pre>
            </div>
            <div>
              <h4>Suggestion</h4>
              <pre>{reply}</pre>
            </div>
          </div>
          {stale && (
            <p role="status">
              The draft changed. Suggest the edit again to use the latest text.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              className="mac-primary"
              disabled={!!stale || reply === suggestion.original}
              onClick={apply}
            >
              Apply Edit
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSuggestion(null);
                setReply("");
                setMessage("");
              }}
            >
              {stale ? "Clear suggestion" : "Discard"}
            </Button>
          </div>
        </section>
      ) : (
        reply && (
          <section aria-label="AI response">
            <h3>{busy ? "Response in progress" : "Response"}</h3>
            <pre>{reply}</pre>
          </section>
        )
      )}
      <Dialog
        open={!!review}
        onOpenChange={(open) => {
          if (!open) setReview(null);
        }}
      >
        {review && (
          <DialogContent className="mac-ai-review" showCloseButton={false}>
            <DialogTitle>Review before sending</DialogTitle>
            <DialogDescription>
              {providers[review.input.provider]} · {review.input.model} ·{" "}
              {review.input.endpoint}
            </DialogDescription>
            <div className="mac-ai-review-body">
              <h3>{actions[review.input.action]}</h3>
              {review.input.prompt && <pre>{review.input.prompt}</pre>}
              {review.input.context.map((part, index) => (
                <details key={index}>
                  <summary>
                    {review.labels[index]} · {part.text.length.toLocaleString()}{" "}
                    characters
                  </summary>
                  <pre>{part.text}</pre>
                </details>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReview(null)}>
                Cancel
              </Button>
              <Button
                className="mac-primary"
                onClick={() => void send(review, true)}
              >
                Send Context
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </section>
  );
}
