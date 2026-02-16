"use client";

import { useEffect, useState, useRef } from "react";
import { useEditorStore } from "@/stores/editor-store";
import { useExportStore } from "@/stores/export-store";
import { useDebounce } from "@/hooks/use-debounce";
import { parseMarkdown, extractMermaidFromHtml } from "@/lib/markdown/parser";
import { MermaidRenderer } from "./mermaid-renderer";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github.css";

// Page dimensions in pixels (at 96 DPI)
const PAGE_DIMENSIONS = {
  a4: { width: 794, height: 1123, label: "A4 (210 × 297 mm)" },
  letter: { width: 816, height: 1056, label: 'Letter (8.5" × 11")' },
  legal: { width: 816, height: 1344, label: 'Legal (8.5" × 14")' },
} as const;

export function MarkdownPreview() {
  const { content } = useEditorStore();
  const { pdfOptions } = useExportStore();
  const debouncedContent = useDebounce(content, 300);
  const [html, setHtml] = useState("");
  const [mermaidDiagrams, setMermaidDiagrams] = useState<
    Array<{ id: string; code: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const renderMarkdown = async () => {
      setIsLoading(true);
      try {
        // Parse markdown to HTML (this now includes Mermaid placeholders)
        const parsedHtml = await parseMarkdown(debouncedContent);

        // Replace Mermaid placeholders with container divs
        let processedHtml = parsedHtml;
        const diagrams = extractMermaidFromHtml(parsedHtml);

        diagrams.forEach((diagram) => {
          const placeholder = `<div class="mermaid-diagram" data-chart="${encodeURIComponent(diagram.code)}" data-id="${diagram.id}"></div>`;
          const container = `<div id="mermaid-container-${diagram.id}" class="my-6 flex justify-center"></div>`;
          processedHtml = processedHtml.replace(placeholder, container);
        });

        setMermaidDiagrams(diagrams);
        setHtml(processedHtml);
      } catch (error) {
        console.error("Preview render error:", error);
        setHtml(`<p class="text-red-500">Error rendering preview</p>`);
      } finally {
        setIsLoading(false);
      }
    };

    renderMarkdown();
  }, [debouncedContent]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const link = target.closest("a");

    if (link && link.hash && scrollContainerRef.current) {
      const targetId = link.hash.slice(1);
      const targetElement = scrollContainerRef.current.querySelector(
        `#${CSS.escape(targetId)}`,
      );

      if (targetElement) {
        e.preventDefault();
        const container = scrollContainerRef.current;
        const elementTop = (targetElement as HTMLElement).offsetTop;
        const containerTop = container.offsetTop;
        const scrollPosition = elementTop - containerTop - 20;

        container.scrollTo({
          top: scrollPosition,
          behavior: "smooth",
        });
      }
    }
  };

  const format = (pdfOptions.format as keyof typeof PAGE_DIMENSIONS) || "a4";
  const pageDimensions = PAGE_DIMENSIONS[format];

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-slate-100 dark:bg-slate-950">
      {/* Page Format Indicator */}
      <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400" />
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {pageDimensions.label}
            </span>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Preview Mode
          </span>
        </div>
      </div>

      {/* Preview Content with Pages */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-auto py-8"
        onClick={handleClick}
      >
        <div className="mx-auto" style={{ width: `${pageDimensions.width}px` }}>
          {/* Page Container */}
          <div
            className="bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-700"
            style={{
              width: `${pageDimensions.width}px`,
              minHeight: `${pageDimensions.height}px`,
            }}
          >
            <div className="p-16">
              {isLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              )}

              <div
                className="text-slate-900 dark:text-slate-100 leading-relaxed
            [&>h1]:text-4xl [&>h1]:font-bold [&>h1]:mb-6 [&>h1]:mt-8
            [&>h2]:text-3xl [&>h2]:font-bold [&>h2]:mb-4 [&>h2]:mt-6
            [&>h3]:text-2xl [&>h3]:font-semibold [&>h3]:mb-3 [&>h3]:mt-5
            [&>h4]:text-xl [&>h4]:font-semibold [&>h4]:mb-2 [&>h4]:mt-4
            [&>h5]:text-lg [&>h5]:font-semibold [&>h5]:mb-2 [&>h5]:mt-3
            [&>h6]:text-base [&>h6]:font-semibold [&>h6]:mb-2 [&>h6]:mt-3
            [&>p]:mb-4 [&>p]:leading-7
            [&>ul]:mb-4 [&>ul]:pl-6 [&>ul]:list-disc
            [&>ol]:mb-4 [&>ol]:pl-6 [&>ol]:list-decimal
            [&>li]:mb-1
            [&>blockquote]:border-l-4 [&>blockquote]:border-blue-500 [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:my-4
            [&>pre]:bg-slate-50 [&>pre]:dark:bg-slate-800 [&>pre]:p-4 [&>pre]:rounded-lg [&>pre]:overflow-x-auto [&>pre]:my-4
            [&>code]:text-sm [&>code]:font-mono
            [&>:not(pre)>code]:bg-slate-100 [&>:not(pre)>code]:dark:bg-slate-800 [&>:not(pre)>code]:px-1.5 [&>:not(pre)>code]:py-0.5 [&>:not(pre)>code]:rounded
            [&_a]:text-blue-600 [&_a]:dark:text-blue-400 [&_a]:underline [&_a]:hover:text-blue-800
            [&>table]:w-full [&>table]:border-collapse [&>table]:my-4
            [&>table_th]:border [&>table_th]:border-slate-300 [&>table_th]:dark:border-slate-700 [&>table_th]:p-2 [&>table_th]:bg-slate-100 [&>table_th]:dark:bg-slate-800 [&>table_th]:font-semibold
            [&>table_td]:border [&>table_td]:border-slate-300 [&>table_td]:dark:border-slate-700 [&>table_td]:p-2
            [&>hr]:my-8 [&>hr]:border-slate-300 [&>hr]:dark:border-slate-700
            [&>img]:rounded-lg [&>img]:shadow-lg [&>img]:my-4"
                dangerouslySetInnerHTML={{ __html: html }}
              />

              {/* Render Mermaid diagrams into containers */}
              {mermaidDiagrams.map((diagram) => (
                <MermaidRenderer
                  key={diagram.id}
                  id={diagram.id}
                  chart={diagram.code}
                />
              ))}
            </div>
          </div>

          {/* Page Break Indicator (shown when there's content) */}
          {html && (
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-dashed border-slate-300 dark:border-slate-600"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-slate-100 dark:bg-slate-950 px-4 py-1 text-xs font-medium text-slate-500 dark:text-slate-400 rounded-full border border-slate-300 dark:border-slate-600">
                  Page Break
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
