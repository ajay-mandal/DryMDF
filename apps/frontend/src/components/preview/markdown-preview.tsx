"use client";

import { useEffect, useState } from "react";
import { useEditorStore } from "@/stores/editor-store";
import { useDebounce } from "@/hooks/use-debounce";
import { parseMarkdown, extractMermaidDiagrams } from "@/lib/markdown/parser";
import { MermaidRenderer } from "./mermaid-renderer";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github.css";

export function MarkdownPreview() {
  const { content } = useEditorStore();
  const debouncedContent = useDebounce(content, 300);
  const [html, setHtml] = useState("");
  const [mermaidDiagrams, setMermaidDiagrams] = useState<
    Array<{ id: string; code: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const renderMarkdown = async () => {
      setIsLoading(true);
      try {
        // Extract Mermaid diagrams before parsing
        const diagrams = extractMermaidDiagrams(debouncedContent);
        setMermaidDiagrams(diagrams);

        // Parse markdown to HTML
        const parsedHtml = await parseMarkdown(debouncedContent);
        setHtml(parsedHtml);
      } catch (error) {
        console.error("Preview render error:", error);
        setHtml(`<p class="text-red-500">Error rendering preview</p>`);
      } finally {
        setIsLoading(false);
      }
    };

    renderMarkdown();
  }, [debouncedContent]);

  return (
    <div className="h-full w-full overflow-auto bg-white dark:bg-slate-900">
      <div className="max-w-4xl mx-auto p-8">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        <div
          className="prose prose-slate dark:prose-invert max-w-none
            prose-headings:font-bold prose-headings:tracking-tight
            prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl
            prose-p:text-base prose-p:leading-7
            prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
            prose-code:text-sm prose-code:bg-slate-100 dark:prose-code:bg-slate-800 
            prose-code:px-1 prose-code:py-0.5 prose-code:rounded
            prose-pre:bg-slate-50 dark:prose-pre:bg-slate-800
            prose-img:rounded-lg prose-img:shadow-lg
            prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:pl-4
            prose-table:border-collapse prose-table:w-full
            prose-th:border prose-th:border-slate-300 dark:prose-th:border-slate-700 prose-th:p-2
            prose-td:border prose-td:border-slate-300 dark:prose-td:border-slate-700 prose-td:p-2"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {/* Render Mermaid diagrams */}
        {mermaidDiagrams.length > 0 && (
          <div className="mt-8 space-y-6">
            {mermaidDiagrams.map((diagram) => (
              <MermaidRenderer
                key={diagram.id}
                id={diagram.id}
                chart={diagram.code}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
