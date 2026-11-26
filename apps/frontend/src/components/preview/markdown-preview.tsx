"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useEditorStore } from "@/stores/editor-store";
import { useExportStore } from "@/stores/export-store";
import { isDesktop } from "@/lib/desktop";
import type { PdfOptions } from "@/types/pdf";
import { toast } from "sonner";
import { MarkdownPreviewPane } from "./markdown-preview-pane";
import { PdfPreviewPane } from "./pdf-preview-pane";

interface MarkdownPreviewProps {
  desktopShell?: boolean;
  sampleContent?: string;
  pdfToolbar?: React.ReactNode;
  documentKey?: string;
  onPreviewModeChange?: (mode: "markdown" | "pdf") => void;
}

interface PdfPreviewRequest {
  id: number;
  content: string;
  documentId?: string;
  documentKey?: string;
  options: PdfOptions;
}

function clonePdfOptions(options: PdfOptions): PdfOptions {
  return {
    ...options,
    margins: options.margins ? { ...options.margins } : undefined,
  };
}

export function MarkdownPreview({
  onPreviewModeChange,
  desktopShell,
  sampleContent,
  pdfToolbar,
  documentKey,
}: MarkdownPreviewProps) {
  const { content: draft, desktopDocumentId } = useEditorStore();
  const content = sampleContent ?? draft;
  const { pdfOptions, updatePdfOptions } = useExportStore();
  const [mode, setPreviewMode] = useState<"markdown" | "pdf">("markdown");
  const previewMode = sampleContent === undefined ? mode : "markdown";
  const [pdfPreviewRequest, setPdfPreviewRequest] =
    useState<PdfPreviewRequest | null>(null);

  useEffect(() => {
    onPreviewModeChange?.(previewMode);
  }, [previewMode, onPreviewModeChange]);

  const isPdfPreviewOutdated =
    previewMode === "pdf" &&
    !!pdfPreviewRequest &&
    (content !== pdfPreviewRequest.content ||
      desktopDocumentId !== pdfPreviewRequest.documentId ||
      documentKey !== pdfPreviewRequest.documentKey);

  useEffect(() => {
    if (previewMode !== "pdf") {
      return;
    }

    Promise.resolve().then(() => {
      setPdfPreviewRequest((currentRequest) => {
        if (!currentRequest) {
          return currentRequest;
        }

        const isMarkdownChanged =
          content !== currentRequest.content ||
          desktopDocumentId !== currentRequest.documentId ||
          documentKey !== currentRequest.documentKey;
        if (isMarkdownChanged) {
          return currentRequest;
        }

        const areOptionsChanged =
          JSON.stringify(pdfOptions) !== JSON.stringify(currentRequest.options);

        if (!areOptionsChanged) {
          return currentRequest;
        }

        toast.success("PDF settings updated", {
          id: "pdf-preview-settings",
          duration: 1200,
        });

        return {
          id: Date.now(),
          content: currentRequest.content,
          documentId: currentRequest.documentId,
          documentKey: currentRequest.documentKey,
          options: clonePdfOptions(pdfOptions),
        };
      });
    });
  }, [previewMode, pdfOptions, content, desktopDocumentId, documentKey]);

  const handlePdfPreviewClick = () => {
    setPreviewMode("pdf");
    setPdfPreviewRequest({
      id: Date.now(),
      content,
      documentId: desktopDocumentId,
      documentKey,
      options: clonePdfOptions(pdfOptions),
    });
  };

  return (
    <div className="h-full min-h-0 w-full flex flex-col overflow-hidden bg-slate-100 dark:bg-slate-900">
      <div className="md-toolbar border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 sm:px-4 py-2">
        <div className="flex items-center justify-between gap-3">
          <div
            className={
              desktopShell ? "hidden" : "flex items-center gap-2 min-w-0"
            }
          >
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
              {previewMode === "pdf" ? "PDF Preview" : "Markdown Preview"}
            </span>
            {isPdfPreviewOutdated && (
              <span className="text-[10px] uppercase tracking-wide text-amber-600 dark:text-amber-400 whitespace-nowrap">
                Outdated preview · re-click PDF Preview
              </span>
            )}
          </div>

          <div className="md-modes flex items-center gap-1 border border-slate-200 dark:border-slate-700 rounded-md p-1 shrink-0">
            <Button
              aria-pressed={previewMode === "markdown"}
              variant={previewMode === "markdown" ? "secondary" : "ghost"}
              size="xs"
              onClick={() => setPreviewMode("markdown")}
            >
              {desktopShell ? "Markdown" : "MD Preview"}
            </Button>
            <Button
              aria-pressed={previewMode === "pdf"}
              variant={previewMode === "pdf" ? "secondary" : "ghost"}
              size="xs"
              onClick={handlePdfPreviewClick}
            >
              {desktopShell ? "PDF" : "PDF Preview"}
            </Button>
          </div>
        </div>
        {desktopShell && previewMode === "pdf" && (
          <div className="mac-pdf-settings">
            {pdfToolbar}
            {isPdfPreviewOutdated && (
              <button
                type="button"
                className="mac-refresh-pdf"
                onClick={handlePdfPreviewClick}
                title="The document has changed since this preview was generated."
              >
                Refresh PDF
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {previewMode === "pdf" ? (
          <PdfPreviewPane
            desktopShell={desktopShell}
            request={
              isDesktop() && isPdfPreviewOutdated ? null : pdfPreviewRequest
            }
            currentPdfOptions={pdfOptions}
            updatePdfOptions={updatePdfOptions}
          />
        ) : (
          <MarkdownPreviewPane key={documentKey} content={content} />
        )}
      </div>
    </div>
  );
}
