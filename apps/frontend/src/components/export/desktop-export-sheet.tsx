"use client";

import { useEffect, useRef, useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import {
  desktopMarginPreset,
  desktopPageSetup,
} from "@/components/preview/desktop-preview";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  exportNotificationsEnabled,
  hasExportNotificationPreference,
  renderDesktopHtml,
  renderDesktopPdf,
  type DesktopExportFormat,
  type SavedDesktopExport,
} from "@/lib/desktop";
import { useEditorStore } from "@/stores/editor-store";
import { useExportStore } from "@/stores/export-store";
import type { PdfOptions } from "@/types/pdf";

const formats = { pdf: "PDF", html: "HTML", md: "Markdown" } as const;

interface Source {
  markdown: string;
  documentId?: string;
  options: PdfOptions;
}

interface Props {
  disabled: boolean;
  folder: string;
  onFolderChange: (folder: string) => void;
  onOfferNotifications: () => void;
}

type Step =
  | { kind: "options" }
  | { kind: "working"; message: string }
  | { kind: "error"; message: string; save: boolean }
  | { kind: "complete"; file: SavedDesktopExport };

export function DesktopExportSheet({
  disabled,
  folder,
  onFolderChange,
  onOfferNotifications,
}: Props) {
  const [source, setSource] = useState<Source>();
  const [filename, setFilename] = useState("");
  const [format, setFormat] = useState<DesktopExportFormat>("pdf");
  const [step, setStep] = useState<Step>({ kind: "options" });
  const [revealing, setRevealing] = useState(false);
  const [revealError, setRevealError] = useState(false);
  const active = useRef(false);
  const inFlight = useRef(false);
  const offer = useRef(false);
  // Freeze the prepared bytes across retries, including any resolved local images.
  const prepared = useRef<{
    format: DesktopExportFormat;
    data: string | ArrayBuffer;
  }>(undefined);
  const handle = step.kind === "complete" ? step.file.handle : undefined;

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);

  useEffect(() => {
    if (!handle) return;
    return () => {
      void window.drymdfDesktop?.releaseExport(handle).catch(() => undefined);
    };
  }, [handle]);

  function changeOpen(open: boolean) {
    if (inFlight.current) return;
    prepared.current = undefined;
    setStep({ kind: "options" });
    setRevealError(false);
    if (open) {
      const { filename, content, desktopDocumentId } =
        useEditorStore.getState();
      setFilename(filename || "document");
      setSource({
        markdown: content,
        documentId: desktopDocumentId,
        options: structuredClone(useExportStore.getState().pdfOptions),
      });
    } else {
      setSource(undefined);
      if (offer.current) {
        offer.current = false;
        onOfferNotifications();
      }
    }
  }

  async function chooseFolder() {
    if (inFlight.current) return;
    inFlight.current = true;
    setStep({ kind: "working", message: "Choose an export folder…" });
    try {
      const result = await window.drymdfDesktop!.chooseExportFolder();
      if (!active.current) return;
      if (result.status === "failed") throw new Error();
      if (result.status === "chosen") onFolderChange(result.folder);
      setStep(result.status === "canceled" ? step : { kind: "options" });
    } catch {
      if (active.current)
        setStep({
          kind: "error",
          message:
            "Couldn’t open the folder picker. Try again or choose a location in the Save dialog.",
          save: true,
        });
    } finally {
      inFlight.current = false;
    }
  }

  async function save() {
    if (inFlight.current || !source) return;
    inFlight.current = true;
    const desktop = window.drymdfDesktop!;
    const name = filename.trim() || "document";
    let saving = false;
    try {
      if (prepared.current?.format !== format) {
        setStep({ kind: "working", message: `Preparing ${formats[format]}…` });
        const { markdown, options, documentId } = source;
        const data =
          format === "pdf"
            ? await (
                await renderDesktopPdf(markdown, options, documentId)
              ).arrayBuffer()
            : format === "html"
              ? await renderDesktopHtml(markdown, documentId)
              : markdown;
        if (!active.current) return;
        prepared.current = { format, data };
      }
      saving = true;
      setStep({
        kind: "working",
        message: "Choose where to save in the Save dialog…",
      });
      const result = await desktop.saveDocument(
        crypto.randomUUID(),
        name,
        format,
        prepared.current.data,
        () => {
          if (active.current)
            setStep({ kind: "working", message: `Saving ${formats[format]}…` });
        },
      );
      if (!active.current) {
        if (result.status === "saved")
          void desktop.releaseExport(result.handle).catch(() => undefined);
        return;
      }
      if (result.status === "canceled") {
        setStep(step);
      } else if (result.status === "invalid") {
        setStep({
          kind: "error",
          message:
            "Enter a file name without slashes or other special path characters.",
          save: false,
        });
      } else if (result.status === "failed") {
        if (result.name)
          setFilename(
            result.name.replace(new RegExp(`\\.${format}$`, "i"), ""),
          );
        if (result.folder) onFolderChange(result.folder);
        throw new Error();
      } else if (result.status === "saved") {
        onFolderChange(result.folder);
        setStep({ kind: "complete", file: result });
        if (format === "pdf") {
          if (exportNotificationsEnabled())
            void desktop.notify("export").catch(() => undefined);
          else if (!hasExportNotificationPreference()) offer.current = true;
        }
      }
    } catch {
      if (active.current)
        setStep({
          kind: "error",
          save: saving,
          message: saving
            ? "Check that the folder is writable or choose another folder. Your document and export settings are still available."
            : `Couldn’t prepare ${formats[format]}. Retry or choose another format.`,
        });
    } finally {
      inFlight.current = false;
    }
  }

  async function reveal(file: SavedDesktopExport) {
    if (inFlight.current) return;
    inFlight.current = true;
    setRevealing(true);
    setRevealError(false);
    try {
      const shown = await window.drymdfDesktop!.revealExport(file.handle);
      if (active.current) setRevealError(!shown);
    } catch {
      if (active.current) setRevealError(true);
    } finally {
      inFlight.current = false;
      if (active.current) setRevealing(false);
    }
  }

  const label = formats[format];
  const working = step.kind === "working";
  const saveError = step.kind === "error" && step.save;
  return (
    <Dialog open={!!source} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button
          className="mac-toolbar-button mac-toolbar-export"
          disabled={disabled}
        >
          <FileDown aria-hidden="true" /> Export…
        </Button>
      </DialogTrigger>
      <DialogContent
        className="mac-sheet mac-export-sheet"
        showCloseButton={false}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {step.kind === "complete"
              ? "Export complete"
              : saveError
                ? `Couldn’t save the ${label}`
                : `Export ${label}`}
          </DialogTitle>
          <DialogDescription>
            {step.kind === "complete"
              ? "Your file is ready to open in Finder."
              : saveError
                ? "DryMDF could not write to the selected folder."
                : "Choose the file name, format, and where to save it."}
          </DialogDescription>
        </DialogHeader>
        {step.kind === "complete" ? (
          <>
            <div className="mac-export-summary" role="status">
              <strong>{step.file.name}</strong>
              <p>{step.file.folder}</p>
            </div>
            {revealError && (
              <p role="alert">
                Couldn’t show the file. It may have been moved or deleted.
              </p>
            )}
            <footer>
              <Button
                variant="outline"
                disabled={revealing}
                onClick={() => changeOpen(false)}
              >
                Done
              </Button>
              <Button
                variant="outline"
                disabled={revealing}
                onClick={() => {
                  setStep({ kind: "options" });
                  setRevealError(false);
                }}
              >
                Export Again
              </Button>
              <Button
                disabled={revealing}
                onClick={() => void reveal(step.file)}
              >
                Show in Finder
              </Button>
            </footer>
          </>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            <fieldset disabled={working} className="mac-export-fields">
              <div className="grid gap-2">
                <Label htmlFor="desktop-export-filename">File name</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="desktop-export-filename"
                    value={filename}
                    placeholder="document"
                    onChange={(event) => {
                      setFilename(event.target.value);
                      setStep({ kind: "options" });
                    }}
                  />
                  <span className="text-sm">.{format}</span>
                </div>
              </div>
              <fieldset className="mac-export-formats">
                <legend>Format</legend>
                {(Object.keys(formats) as DesktopExportFormat[]).map(
                  (value) => (
                    <label key={value}>
                      <input
                        className="sr-only"
                        type="radio"
                        name="desktop-export-format"
                        value={value}
                        checked={format === value}
                        onChange={() => {
                          setFormat(value);
                          setStep({ kind: "options" });
                        }}
                      />
                      <span>{formats[value]}</span>
                    </label>
                  ),
                )}
              </fieldset>
              <div className="mac-export-summary mac-export-destination">
                <div>
                  <strong>Save to</strong>
                  <p>{folder}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void chooseFolder()}
                >
                  Choose…
                </Button>
              </div>
              {format === "pdf" && source && (
                <div className="mac-export-summary">
                  <strong>PDF summary</strong>
                  <p>
                    {desktopPageSetup(source.options)} ·{" "}
                    {desktopMarginPreset(source.options) ?? "Custom"} margins
                  </p>
                </div>
              )}
            </fieldset>
            {step.kind === "error" && (
              <p className="mt-2" role="alert">
                {step.message}
              </p>
            )}
            {step.kind === "working" && (
              <p className="mt-2 flex items-center gap-2" role="status">
                <Loader2
                  className="size-4 motion-safe:animate-spin"
                  aria-hidden="true"
                />
                {step.message}
              </p>
            )}
            <footer>
              <Button
                type="button"
                variant="outline"
                disabled={working}
                onClick={() => changeOpen(false)}
              >
                Cancel
              </Button>
              {saveError ? (
                <>
                  <Button type="submit" variant="outline">
                    Retry
                  </Button>
                  <Button type="button" onClick={() => void chooseFolder()}>
                    Choose Folder
                  </Button>
                </>
              ) : (
                <Button type="submit" disabled={working}>
                  {step.kind === "error" ? "Retry" : `Export ${label}`}
                </Button>
              )}
            </footer>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
