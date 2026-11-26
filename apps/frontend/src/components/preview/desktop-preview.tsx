"use client";

import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PdfSettings } from "@/components/layout/header";
import { renderDesktopPdf } from "@/lib/desktop";
import { useExportStore } from "@/stores/export-store";
import type { PdfOptions } from "@/types/pdf";
import { MarkdownPreviewPane } from "./markdown-preview-pane";
import { capturePdfPreview, isPdfPreviewStale } from "./pdf-preview-snapshot";

const paperSizes = { a4: "A4", a3: "A3", legal: "Legal" } as const;
const orientations = { portrait: "Portrait", landscape: "Landscape" } as const;
const marginPresets = { Narrow: "12mm", Normal: "20mm", Wide: "28mm" } as const;
const marginSides = ["top", "right", "bottom", "left"] as const;

type PreviewMode = "markdown" | "pdf";
type Snapshot = ReturnType<typeof capturePdfPreview>;
type Result = { snapshot: Snapshot; url?: string };

export function desktopPageSetup(options: PdfOptions): string {
  return `${paperSizes[options.format ?? "a4"]} · ${orientations[options.orientation ?? "portrait"]}`;
}

export function desktopPdfStatus(options: PdfOptions): string {
  return `${desktopPageSetup(options)} · 100%`;
}

export function desktopMarginPreset(pdfOptions: PdfOptions) {
  return Object.entries(marginPresets).find(([, value]) =>
    marginSides.every(
      (side) => (pdfOptions.margins?.[side] || "20mm") === value,
    ),
  )?.[0];
}

interface DesktopPreviewProps {
  markdown: string;
  documentId?: string;
  sourceKey: string;
  sample?: boolean;
  mode: PreviewMode;
  onModeChange: (mode: PreviewMode) => void;
}

export function DesktopPreview({
  markdown,
  documentId,
  sourceKey,
  sample,
  mode,
  onModeChange,
}: DesktopPreviewProps) {
  const { pdfOptions, updatePdfOptions } = useExportStore();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const current = { markdown, documentId, sourceKey, options: pdfOptions };
  const stale = snapshot !== null && isPdfPreviewStale(snapshot, current);
  const settled = result?.snapshot === snapshot ? result : null;
  const generating = snapshot !== null && !settled;
  const marginPreset = desktopMarginPreset(pdfOptions);

  useEffect(() => {
    if (!snapshot) return;
    let active = true;
    let url: string | undefined;
    void renderDesktopPdf(
      snapshot.markdown,
      snapshot.options,
      snapshot.documentId,
    )
      .then((pdf) => {
        if (!active) return;
        url = URL.createObjectURL(pdf);
        setResult({ snapshot, url });
      })
      .catch(() => {
        if (active) setResult({ snapshot });
      });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [snapshot]);

  const pdfMode = !sample && mode === "pdf";
  const heading = stale
    ? "Preview is out of date"
    : generating
      ? "Generating PDF preview…"
      : settled
        ? "Could not generate PDF preview"
        : "No PDF preview yet";

  return (
    <div className="h-full min-h-0 w-full flex flex-col overflow-hidden">
      <div className="md-toolbar">
        <div className="md-modes inline-flex items-center rounded-md">
          <Button
            aria-pressed={!pdfMode}
            variant="ghost"
            size="xs"
            onClick={() => onModeChange("markdown")}
          >
            Markdown
          </Button>
          <Button
            aria-pressed={pdfMode}
            variant="ghost"
            size="xs"
            disabled={sample}
            onClick={() => onModeChange("pdf")}
          >
            PDF
          </Button>
        </div>
        {pdfMode && (
          <div
            className="mac-pdf-settings"
            role="group"
            aria-label="PDF page setup"
          >
            <label>
              Paper size
              <select
                value={pdfOptions.format ?? "a4"}
                onChange={(event) =>
                  updatePdfOptions({
                    format: event.target.value as keyof typeof paperSizes,
                  })
                }
              >
                {Object.entries(paperSizes).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Orientation
              <select
                value={pdfOptions.orientation ?? "portrait"}
                onChange={(event) =>
                  updatePdfOptions({
                    orientation: event.target
                      .value as keyof typeof orientations,
                  })
                }
              >
                {Object.entries(orientations).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Margins
              <select
                value={marginPreset ?? "Custom"}
                onChange={(event) => {
                  const value =
                    marginPresets[
                      event.target.value as keyof typeof marginPresets
                    ];
                  if (value)
                    updatePdfOptions({
                      margins: {
                        top: value,
                        right: value,
                        bottom: value,
                        left: value,
                      },
                    });
                }}
              >
                {!marginPreset && <option disabled>Custom</option>}
                {Object.keys(marginPresets).map((label) => (
                  <option key={label}>{label}</option>
                ))}
              </select>
            </label>
            <PdfSettings hidePaperSize />
          </div>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        {!pdfMode ? (
          <MarkdownPreviewPane key={sourceKey} content={markdown} />
        ) : !stale && settled?.url ? (
          <iframe
            className="mac-pdf-viewer"
            title="PDF preview"
            src={`${settled.url}#toolbar=0&navpanes=0&zoom=100`}
          />
        ) : (
          <div className="mac-pdf-empty">
            <FileText aria-hidden="true" />
            <div role="status">
              <h2>{heading}</h2>
              {stale && <p>The document or its PDF settings have changed.</p>}
              {!snapshot && <p>Generate a PDF preview from this document.</p>}
            </div>
            {(!generating || stale) && (
              <Button
                className="mac-primary"
                disabled={!markdown.trim()}
                onClick={() => setSnapshot(capturePdfPreview(current))}
              >
                {snapshot ? "Refresh PDF" : "Generate Preview"}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
