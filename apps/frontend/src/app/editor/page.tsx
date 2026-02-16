"use client";

import { Header } from "@/components/layout/header";
import { SplitPane } from "@/components/layout/split-pane";
import { MarkdownEditor } from "@/components/editor/markdown-editor";
import { MarkdownPreview } from "@/components/preview/markdown-preview";
import { useEditorStore } from "@/stores/editor-store";

export default function EditorPage() {
  const { content } = useEditorStore();

  const handleExport = async (filename: string) => {
    try {
      // For now, do a simple client-side PDF generation via print
      // In the future, this could use the backend API
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        const { parseMarkdown } = await import("@/lib/markdown/parser");
        const html = await parseMarkdown(content);

        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>${filename}</title>
              <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
              <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; padding: 20px; max-width: 800px; margin: 0 auto; }
                pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow-x: auto; }
                code { font-family: 'Monaco', 'Courier New', monospace; font-size: 0.9em; }
                table { border-collapse: collapse; width: 100%; margin: 1em 0; }
                th, td { border: 1px solid #ddd; padding: 8px; }
                th { background: #f6f8fa; }
                @media print { body { max-width: 100%; } }
              </style>
            </head>
            <body>${html}</body>
          </html>
        `);
        printWindow.document.close();

        // Trigger print dialog
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900">
      <Header showExport onExport={handleExport} />
      <div className="flex-1 overflow-hidden">
        <SplitPane left={<MarkdownEditor />} right={<MarkdownPreview />} />
      </div>
    </div>
  );
}
