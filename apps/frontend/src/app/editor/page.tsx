"use client";

import { useEffect, useRef, useState } from "react";
import { Header } from "@/components/layout/header";
import { SplitPane } from "@/components/layout/split-pane";
import { MarkdownEditor } from "@/components/editor/markdown-editor";
import { MarkdownPreview } from "@/components/preview/markdown-preview";
import { useEditorStore } from "@/stores/editor-store";
import { useExportStore } from "@/stores/export-store";
import { apiClient } from "@/lib/api/client";
import { useMarkdownFileUpload } from "@/hooks/use-markdown-file-upload";
import { toast } from "sonner";

export default function EditorPage() {
  const { content, filename, setContent, setFilename } = useEditorStore();
  const { pdfOptions, setExporting } = useExportStore();
  const [previewMode, setPreviewMode] = useState<"markdown" | "pdf">(
    "markdown",
  );
  const [autoSaveStatus, setAutoSaveStatus] = useState<"saving" | "saved">(
    "saved",
  );
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    Promise.resolve().then(() => setAutoSaveStatus("saving"));
    const timer = window.setTimeout(() => {
      setAutoSaveStatus("saved");
      setLastSavedAt(new Date());
    }, 450);

    return () => {
      window.clearTimeout(timer);
    };
  }, [content]);

  const ensureExtension = (
    baseFilename: string,
    extension: ".pdf" | ".html" | ".md",
  ) => {
    return baseFilename.toLowerCase().endsWith(extension)
      ? baseFilename
      : `${baseFilename}${extension}`;
  };

  const downloadBlob = (blob: Blob, downloadName: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = downloadName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const { handleUploadMarkdownFile } = useMarkdownFileUpload({
    onContentLoaded: setContent,
    onFilenameLoaded: setFilename,
  });

  const handleExport = async (
    filename: string,
    format: "pdf" | "html" | "md",
  ) => {
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    try {
      setExporting(true);

      if (format === "md") {
        const markdownFilename = ensureExtension(filename || "document", ".md");
        downloadBlob(
          new Blob([content], {
            type: "text/markdown;charset=utf-8",
          }),
          markdownFilename,
        );
        toast.success(`Markdown exported: ${markdownFilename}`);
        setExporting(false);
        return;
      }

      if (format === "html") {
        toast.loading("Generating HTML...", { id: "doc-export" });
        const { html } = await apiClient.convertToHtml(content);
        const htmlFilename = ensureExtension(filename || "document", ".html");
        const htmlDocument = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>${html}</body></html>`;

        downloadBlob(
          new Blob([htmlDocument], {
            type: "text/html;charset=utf-8",
          }),
          htmlFilename,
        );

        toast.success(`HTML exported: ${htmlFilename}`, {
          id: "doc-export",
        });
        setExporting(false);
        return;
      }

      // Generate a unique client ID for WebSocket tracking
      const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Queue the PDF generation job
      toast.loading("Queuing PDF generation...", { id: "pdf-export" });

      const { jobId } = await apiClient.convertToPdf(
        content,
        clientId,
        pdfOptions,
      );

      // Poll for job completion
      toast.loading("Generating PDF...", { id: "pdf-export" });

      pollInterval = setInterval(async () => {
        try {
          const status = await apiClient.getPdfStatus(jobId);

          if (status.status === "completed" && status.result) {
            if (pollInterval) clearInterval(pollInterval);
            if (timeoutId) clearTimeout(timeoutId);

            toast.loading("Preparing download...", { id: "pdf-export" });

            // Decode base64 PDF and download
            const pdfData = atob(status.result.buffer);
            const pdfArray = new Uint8Array(pdfData.length);
            for (let i = 0; i < pdfData.length; i++) {
              pdfArray[i] = pdfData.charCodeAt(i);
            }

            const blob = new Blob([pdfArray], { type: "application/pdf" });
            const pdfFilename = ensureExtension(filename || "document", ".pdf");
            downloadBlob(blob, pdfFilename);

            toast.success(`PDF exported successfully: ${pdfFilename}`, {
              id: "pdf-export",
              duration: 5000,
            });
            setExporting(false);
          } else if (status.status === "failed") {
            if (pollInterval) clearInterval(pollInterval);
            if (timeoutId) clearTimeout(timeoutId);
            toast.error("PDF generation failed", {
              id: "pdf-export",
              description: "There was an error processing your document.",
            });
            setExporting(false);
          }
        } catch (err) {
          if (pollInterval) clearInterval(pollInterval);
          if (timeoutId) clearTimeout(timeoutId);
          const errorMsg = err instanceof Error ? err.message : "Unknown error";
          toast.error("Failed to check PDF status", {
            id: "pdf-export",
            description: errorMsg || "Unable to communicate with the server.",
          });
          setExporting(false);
        }
      }, 1000); // Poll every second

      // Timeout after 30 seconds
      timeoutId = setTimeout(() => {
        if (pollInterval) {
          clearInterval(pollInterval);
          toast.error("PDF generation timed out", {
            id: "pdf-export",
            description: "The operation took too long. Please try again.",
          });
          setExporting(false);
        }
      }, 30000);
    } catch (error) {
      if (pollInterval) clearInterval(pollInterval);
      if (timeoutId) clearTimeout(timeoutId);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      toast.error("Export failed", {
        id: "pdf-export",
        description: errorMessage,
      });
      setExporting(false);
    }
  };

  return (
    <div className="h-dvh w-full flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900">
      <Header
        filename={filename}
        showExport
        onExport={handleExport}
        onUploadMarkdownFile={handleUploadMarkdownFile}
        showPdfSettings={previewMode === "pdf"}
        autoSaveStatus={autoSaveStatus}
        lastSavedAt={lastSavedAt}
      />
      <div className="flex-1 min-h-0 overflow-hidden">
        <SplitPane
          left={<MarkdownEditor />}
          right={<MarkdownPreview onPreviewModeChange={setPreviewMode} />}
        />
      </div>
    </div>
  );
}
