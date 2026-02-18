"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { parseMarkdown, extractMermaidFromHtml } from "@/lib/markdown/parser";
import { MermaidRenderer } from "./mermaid-renderer";
import { toast } from "sonner";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github.css";

interface MarkdownPreviewPaneProps {
  content: string;
}

const HTML_BLOCK_CLASSES =
  "[&>h1]:text-[2em] [&>h1]:font-semibold [&>h1]:mt-6 [&>h1]:mb-4 [&>h1]:leading-tight [&>h1]:border-b [&>h1]:border-slate-200 dark:[&>h1]:border-slate-700 [&>h1]:pb-1.5 " +
  "[&>h2]:text-[1.5em] [&>h2]:font-semibold [&>h2]:mt-6 [&>h2]:mb-4 [&>h2]:leading-tight [&>h2]:border-b [&>h2]:border-slate-200 dark:[&>h2]:border-slate-700 [&>h2]:pb-1.5 " +
  "[&>h3]:text-[1.25em] [&>h3]:font-semibold [&>h3]:mt-6 [&>h3]:mb-4 [&>h3]:leading-tight " +
  "[&>h4]:text-[1em] [&>h4]:font-semibold [&>h4]:mt-6 [&>h4]:mb-4 " +
  "[&>h5]:text-[0.875em] [&>h5]:font-semibold [&>h5]:mt-6 [&>h5]:mb-4 " +
  "[&>h6]:text-[0.85em] [&>h6]:font-semibold [&>h6]:mt-6 [&>h6]:mb-4 [&>h6]:text-slate-600 dark:[&>h6]:text-slate-400 " +
  "[&>p]:mt-0 [&>p]:mb-4 " +
  "[&>pre]:bg-slate-50 dark:[&>pre]:bg-slate-900 [&>pre]:p-4 [&>pre]:rounded-md [&>pre]:overflow-x-auto [&>pre]:border [&>pre]:border-slate-200 dark:[&>pre]:border-slate-700 [&>pre]:mb-4 [&>pre]:text-[85%] " +
  "[&>pre>code]:bg-transparent [&>pre>code]:p-0 [&>pre>code]:rounded-none " +
  "[&_code]:font-mono [&_code]:text-[85%] [&_code]:bg-slate-100 dark:[&_code]:bg-slate-700 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded " +
  "[&>blockquote]:border-l-4 [&>blockquote]:border-slate-300 dark:[&>blockquote]:border-slate-600 [&>blockquote]:pl-4 [&>blockquote]:my-0 [&>blockquote]:mr-0 [&>blockquote]:text-slate-600 dark:[&>blockquote]:text-slate-400 " +
  "[&>ul]:pl-8 [&>ul]:mt-0 [&>ul]:mb-4 " +
  "[&>ol]:pl-8 [&>ol]:mt-0 [&>ol]:mb-4 " +
  "[&_li]:mb-1 " +
  "[&>table]:w-full [&>table]:border-collapse [&>table]:mt-0 [&>table]:mb-4 " +
  "[&_th]:border [&_th]:border-slate-300 dark:[&_th]:border-slate-600 [&_th]:px-3 [&_th]:py-1.5 [&_th]:bg-slate-50 dark:[&_th]:bg-slate-700 [&_th]:font-semibold [&_th]:text-left " +
  "[&_td]:border [&_td]:border-slate-300 dark:[&_td]:border-slate-600 [&_td]:px-3 [&_td]:py-1.5 " +
  "[&_tr]:bg-slate-50 dark:[&_tr]:bg-slate-800 [&_tr]:border-t [&_tr]:border-slate-300 dark:[&_tr]:border-slate-600 " +
  "[&_tr:nth-child(even)]:bg-slate-100 dark:[&_tr:nth-child(even)]:bg-slate-700/50 " +
  "[&_a]:text-blue-600 dark:[&_a]:text-blue-400 [&_a]:underline " +
  "[&>hr]:border-0 [&>hr]:border-t [&>hr]:border-slate-300 dark:[&>hr]:border-slate-700 [&>hr]:my-6 " +
  "[&>img]:max-w-full [&>img]:my-4";

export function MarkdownPreviewPane({ content }: MarkdownPreviewPaneProps) {
  const debouncedContent = useDebounce(content, 300);
  const [html, setHtml] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mermaidDiagrams, setMermaidDiagrams] = useState<
    Array<{ id: string; code: string }>
  >([]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const renderMarkdown = async () => {
      setIsLoading(true);
      try {
        const parsedHtml = await parseMarkdown(debouncedContent);
        const diagrams = extractMermaidFromHtml(parsedHtml);
        setMermaidDiagrams(diagrams);
        setHtml(parsedHtml);
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "Unknown error";
        toast.error("Preview render failed", {
          description: errorMsg,
          duration: 3000,
        });
        setHtml(
          '<p class="text-red-500">Error rendering preview. Please check your markdown syntax.</p>',
        );
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
        const elementTop = (targetElement as HTMLElement).offsetTop;
        scrollContainerRef.current.scrollTo({
          top: Math.max(0, elementTop - 20),
          behavior: "smooth",
        });
      }
    }
  };

  const renderedParts = useMemo(() => {
    if (mermaidDiagrams.length === 0) {
      return [
        <div
          key="html-full"
          className={HTML_BLOCK_CLASSES}
          dangerouslySetInnerHTML={{ __html: html }}
        />,
      ];
    }

    const parts: React.ReactNode[] = [];
    let remainingHtml = html;

    mermaidDiagrams.forEach((diagram, index) => {
      const placeholder = `<div class="mermaid-diagram" data-chart="${encodeURIComponent(diagram.code)}" data-id="${diagram.id}"></div>`;
      const [before, after] = remainingHtml.split(placeholder);

      if (before) {
        parts.push(
          <div
            key={`html-${index}`}
            className={HTML_BLOCK_CLASSES}
            dangerouslySetInnerHTML={{ __html: before }}
          />,
        );
      }

      parts.push(
        <div key={`mermaid-${diagram.id}`} className="break-inside-avoid">
          <MermaidRenderer id={diagram.id} chart={diagram.code} />
        </div>,
      );

      remainingHtml = after || "";
    });

    if (remainingHtml) {
      parts.push(
        <div
          key="html-last"
          className={HTML_BLOCK_CLASSES}
          dangerouslySetInnerHTML={{ __html: remainingHtml }}
        />,
      );
    }

    return parts;
  }, [html, mermaidDiagrams]);

  return (
    <div className="h-full min-h-0 w-full flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900">
      <div
        ref={scrollContainerRef}
        onClick={handleClick}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain px-4 sm:px-6 py-4 sm:py-6"
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-blue-500" />
              <span className="text-sm text-slate-500">
                Rendering preview...
              </span>
            </div>
          </div>
        ) : (
          <div
            className="relative"
            style={{
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              lineHeight: "1.6",
            }}
            data-md-preview-pane="true"
          >
            <style>
              {`
[data-md-preview-pane="true"] pre code.hljs,
[data-md-preview-pane="true"] code.hljs {
  background: transparent !important;
}

[data-md-preview-pane="true"] :not(pre) > code {
  color: hsl(var(--foreground)) !important;
  background: hsl(var(--muted)) !important;
}

[data-md-preview-pane="true"] {
  --md-hljs-comment: #6b7280;
  --md-hljs-neutral: #334155;
  --md-hljs-keyword: #c7254e;
  --md-hljs-string: #2f855a;
  --md-hljs-number: #7c3aed;
  --md-hljs-title: #2b8a3e;
  --md-hljs-builtin: #0b7285;
  --md-hljs-attr: #d9480f;
}

.dark [data-md-preview-pane="true"] {
  --md-hljs-comment: #75715e;
  --md-hljs-neutral: #e2e8f0;
  --md-hljs-keyword: #f92672;
  --md-hljs-string: #e6db74;
  --md-hljs-number: #ae81ff;
  --md-hljs-title: #a6e22e;
  --md-hljs-builtin: #66d9ef;
  --md-hljs-attr: #fd971f;
}

[data-md-preview-pane="true"] .hljs {
  background: hsl(var(--muted)) !important;
  color: var(--md-hljs-neutral) !important;
}

[data-md-preview-pane="true"] .hljs-subst,
[data-md-preview-pane="true"] .hljs-operator,
[data-md-preview-pane="true"] .hljs-punctuation,
[data-md-preview-pane="true"] .hljs-property,
[data-md-preview-pane="true"] .hljs-params,
[data-md-preview-pane="true"] .hljs-variable,
[data-md-preview-pane="true"] .hljs-variable.language_,
[data-md-preview-pane="true"] .hljs-title.class_.inherited__ {
  color: var(--md-hljs-neutral) !important;
}

[data-md-preview-pane="true"] .hljs-keyword,
[data-md-preview-pane="true"] .hljs-selector-tag,
[data-md-preview-pane="true"] .hljs-meta .hljs-keyword,
[data-md-preview-pane="true"] .hljs-doctag {
  color: var(--md-hljs-keyword) !important;
}

[data-md-preview-pane="true"] .hljs-comment,
[data-md-preview-pane="true"] .hljs-quote,
[data-md-preview-pane="true"] .hljs-doctag {
  color: var(--md-hljs-comment) !important;
}

[data-md-preview-pane="true"] .hljs-string,
[data-md-preview-pane="true"] .hljs-char.escape_,
[data-md-preview-pane="true"] .hljs-template-variable,
[data-md-preview-pane="true"] .hljs-addition {
  color: var(--md-hljs-string) !important;
}

[data-md-preview-pane="true"] .hljs-number,
[data-md-preview-pane="true"] .hljs-literal,
[data-md-preview-pane="true"] .hljs-symbol,
[data-md-preview-pane="true"] .hljs-bullet {
  color: var(--md-hljs-number) !important;
}

[data-md-preview-pane="true"] .hljs-title,
[data-md-preview-pane="true"] .hljs-section,
[data-md-preview-pane="true"] .hljs-name,
[data-md-preview-pane="true"] .hljs-function .hljs-title,
[data-md-preview-pane="true"] .hljs-title.class_ {
  color: var(--md-hljs-title) !important;
}

[data-md-preview-pane="true"] .hljs-built_in,
[data-md-preview-pane="true"] .hljs-builtin-name,
[data-md-preview-pane="true"] .hljs-type,
[data-md-preview-pane="true"] .hljs-meta,
[data-md-preview-pane="true"] .hljs-link {
  color: var(--md-hljs-builtin) !important;
}

[data-md-preview-pane="true"] .hljs-attribute,
[data-md-preview-pane="true"] .hljs-selector-attr,
[data-md-preview-pane="true"] .hljs-selector-id,
[data-md-preview-pane="true"] .hljs-selector-class,
[data-md-preview-pane="true"] .hljs-regexp,
[data-md-preview-pane="true"] .hljs-deletion {
  color: var(--md-hljs-attr) !important;
}

[data-md-preview-pane="true"] .hljs-emphasis {
  font-style: italic;
}

[data-md-preview-pane="true"] .hljs-strong {
  font-weight: 700;
}
`}
            </style>
            {renderedParts}
          </div>
        )}
      </div>
    </div>
  );
}
