"use client";

import { useEffect, useState, useRef } from "react";
import { useEditorStore } from "@/stores/editor-store";
import { useExportStore } from "@/stores/export-store";
import { useDebounce } from "@/hooks/use-debounce";
import { apiClient } from "@/lib/api/client";
import { parseMarkdown, extractMermaidFromHtml } from "@/lib/markdown/parser";
import { MermaidRenderer } from "./mermaid-renderer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github.css";

// Page dimensions in pixels (at 96 DPI)
const PAGE_DIMENSIONS = {
  a3: {
    width: 1123,
    height: 1587,
    label: 'A3 (11.69" × 16.54")',
  },
  a4: {
    width: 794,
    height: 1123,
    label: 'A4 (8.27" × 11.69")',
  },
  legal: {
    width: 816,
    height: 1344,
    label: 'Legal (8.5" × 14")',
  },
} as const;

// Match backend PDF settings exactly
const PDF_MARGIN_MM = 20; // 20mm margins in PDF
const PDF_MARGIN_PX = (PDF_MARGIN_MM * 96) / 25.4; // Convert to pixels (96 DPI)
const BODY_PADDING_PX = 20; // body padding in PDF
const TOTAL_PADDING = PDF_MARGIN_PX + BODY_PADDING_PX;
const PREVIEW_GAP = 32; // Gap around preview in pixels

function isDarkHexColor(color: string): boolean {
  const normalized = color.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return false;
  }

  const red = parseInt(normalized.slice(0, 2), 16);
  const green = parseInt(normalized.slice(2, 4), 16);
  const blue = parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
  return luminance < 0.5;
}

export function MarkdownPreview() {
  const { content } = useEditorStore();
  const { pdfOptions, updatePdfOptions } = useExportStore();
  const debouncedContent = useDebounce(content, 300);
  const [html, setHtml] = useState("");
  const [mermaidDiagrams, setMermaidDiagrams] = useState<
    Array<{ id: string; code: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pageCount, setPageCount] = useState(1);
  const [scale, setScale] = useState(1);
  const [manualScale, setManualScale] = useState<number | null>(null);
  const [showZoomIndicator, setShowZoomIndicator] = useState(false);
  const [previewMode, setPreviewMode] = useState<"markdown" | "pdf">(
    "markdown",
  );
  const [pdfPreviewVersion, setPdfPreviewVersion] = useState(0);
  const [exactPdfUrl, setExactPdfUrl] = useState<string | null>(null);
  const [isExactPdfLoading, setIsExactPdfLoading] = useState(false);
  const [pdfPreviewProgress, setPdfPreviewProgress] = useState(0);
  const [displayPdfPreviewProgress, setDisplayPdfPreviewProgress] = useState(0);
  const [pdfPreviewStage, setPdfPreviewStage] = useState("idle");
  const [pdfPreviewPayload, setPdfPreviewPayload] = useState<{
    markdown: string;
    options: typeof pdfOptions;
  } | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const zoomTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const exactPdfRequestRef = useRef(0);

  // Handle mouse wheel zoom (Ctrl + Scroll)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();

        const delta = -e.deltaY;
        const zoomIntensity = 0.001;

        // Use functional update to get current scale value
        setScale((currentScale) => {
          const newScale = currentScale * (1 + delta * zoomIntensity);
          const clampedScale = Math.min(Math.max(newScale, 0.1), 2);
          setManualScale(clampedScale);
          return clampedScale;
        });

        // Show zoom indicator
        setShowZoomIndicator(true);
        if (zoomTimeoutRef.current) {
          clearTimeout(zoomTimeoutRef.current);
        }
        zoomTimeoutRef.current = setTimeout(() => {
          setShowZoomIndicator(false);
        }, 2000);
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      container.removeEventListener("wheel", handleWheel);
      if (zoomTimeoutRef.current) {
        clearTimeout(zoomTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const renderMarkdown = async () => {
      setIsLoading(true);
      try {
        // Parse markdown to HTML (this now includes Mermaid placeholders)
        const parsedHtml = await parseMarkdown(debouncedContent);

        // Extract Mermaid diagrams
        const diagrams = extractMermaidFromHtml(parsedHtml);
        setMermaidDiagrams(diagrams);

        // Split HTML by mermaid placeholders to get an array of HTML segments
        let segments = [parsedHtml];
        diagrams.forEach((diagram) => {
          const placeholder = `<div class="mermaid-diagram" data-chart="${encodeURIComponent(diagram.code)}" data-id="${diagram.id}"></div>`;
          segments = segments.flatMap((segment) => segment.split(placeholder));
        });

        setHtml(parsedHtml);
      } catch (error) {
        console.error("Preview render error:", error);
        const errorMsg =
          error instanceof Error ? error.message : "Unknown error";
        toast.error("Preview render failed", {
          description: errorMsg,
          duration: 3000,
        });
        setHtml(
          `<p class="text-red-500">Error rendering preview. Please check your markdown syntax.</p>`,
        );
      } finally {
        setIsLoading(false);
      }
    };

    renderMarkdown();
  }, [debouncedContent]);

  useEffect(() => {
    if (
      previewMode !== "pdf" ||
      pdfPreviewVersion === 0 ||
      !pdfPreviewPayload
    ) {
      return;
    }

    if (!pdfPreviewPayload.markdown.trim()) {
      setExactPdfUrl((currentUrl) => {
        if (currentUrl) {
          URL.revokeObjectURL(currentUrl);
        }
        return null;
      });
      setIsExactPdfLoading(false);
      setPdfPreviewProgress(0);
      setPdfPreviewStage("idle");
      return;
    }

    let cancelled = false;
    const requestId = ++exactPdfRequestRef.current;

    const base64ToPdfBlobUrl = (base64: string): string => {
      const binaryString = window.atob(base64);
      const length = binaryString.length;
      const bytes = new Uint8Array(length);

      for (let index = 0; index < length; index += 1) {
        bytes[index] = binaryString.charCodeAt(index);
      }

      const blob = new Blob([bytes], { type: "application/pdf" });
      return URL.createObjectURL(blob);
    };

    const generateExactPreview = async () => {
      setIsExactPdfLoading(true);
      setPdfPreviewProgress(8);
      setPdfPreviewStage("queued");

      try {
        const clientId = `preview-${requestId}-${Date.now()}`;
        const queuedJob = await apiClient.convertToPdf(
          pdfPreviewPayload.markdown,
          clientId,
          pdfPreviewPayload.options,
        );

        if (!queuedJob?.jobId) {
          throw new Error("Unable to start preview job");
        }

        for (let attempt = 0; attempt < 60; attempt += 1) {
          if (cancelled || requestId !== exactPdfRequestRef.current) {
            return;
          }

          const status = await apiClient.getPdfStatus(queuedJob.jobId);
          const progressValue =
            typeof status.progress === "number"
              ? Math.min(Math.max(status.progress, 0), 100)
              : status.status === "completed"
                ? 100
                : status.status === "failed"
                  ? 0
                  : 20;

          setPdfPreviewProgress(progressValue);
          setPdfPreviewStage(status.status);

          if (status.status === "completed" && status.result?.buffer) {
            const url = base64ToPdfBlobUrl(status.result.buffer);

            if (cancelled || requestId !== exactPdfRequestRef.current) {
              URL.revokeObjectURL(url);
              return;
            }

            setExactPdfUrl((currentUrl) => {
              if (currentUrl) {
                URL.revokeObjectURL(currentUrl);
              }
              return url;
            });

            setPdfPreviewProgress(100);
            setPdfPreviewStage("completed");
            setIsExactPdfLoading(false);
            return;
          }

          if (status.status === "failed") {
            throw new Error("PDF preview generation failed");
          }

          await new Promise((resolve) => setTimeout(resolve, 700));
        }

        throw new Error("PDF preview timed out");
      } catch {
        if (cancelled || requestId !== exactPdfRequestRef.current) {
          return;
        }

        setPdfPreviewProgress(0);
        setPdfPreviewStage("failed");
        setIsExactPdfLoading(false);
      }
    };

    generateExactPreview();

    return () => {
      cancelled = true;
    };
  }, [previewMode, pdfPreviewVersion, pdfPreviewPayload]);

  useEffect(() => {
    return () => {
      setExactPdfUrl((currentUrl) => {
        if (currentUrl) {
          URL.revokeObjectURL(currentUrl);
        }
        return null;
      });
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setDisplayPdfPreviewProgress((current) => {
        const delta = pdfPreviewProgress - current;

        if (Math.abs(delta) < 0.2) {
          window.clearInterval(timer);
          return pdfPreviewProgress;
        }

        const easing = delta > 0 ? 0.16 : 0.28;
        return current + delta * easing;
      });
    }, 16);

    return () => {
      window.clearInterval(timer);
    };
  }, [pdfPreviewProgress]);

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

  const handleDoubleClick = () => {
    if (manualScale !== null) {
      setManualScale(null);
      setShowZoomIndicator(true);
      if (zoomTimeoutRef.current) {
        clearTimeout(zoomTimeoutRef.current);
      }
      zoomTimeoutRef.current = setTimeout(() => {
        setShowZoomIndicator(false);
      }, 2000);
    }
  };

  const showZoomFeedback = () => {
    setShowZoomIndicator(true);
    if (zoomTimeoutRef.current) {
      clearTimeout(zoomTimeoutRef.current);
    }
    zoomTimeoutRef.current = setTimeout(() => {
      setShowZoomIndicator(false);
    }, 2000);
  };

  const handleFitWidthZoom = () => {
    setManualScale(null);
    showZoomFeedback();
  };

  const handleHundredPercentZoom = () => {
    setManualScale(1);
    setScale(1);
    showZoomFeedback();
  };

  const handleFitPageZoom = () => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    const availableWidth = container.clientWidth - PREVIEW_GAP * 2;
    const availableHeight = container.clientHeight - PREVIEW_GAP * 2;
    const fitPageScale = Math.min(
      availableWidth / pageWidth,
      availableHeight / pageHeight,
      2,
    );
    const clampedScale = Math.max(0.1, fitPageScale);

    setManualScale(clampedScale);
    setScale(clampedScale);
    showZoomFeedback();
  };

  const handleSwitchToMarkdownPreview = () => {
    setPreviewMode("markdown");
    setIsExactPdfLoading(false);
    setPdfPreviewProgress(0);
    setDisplayPdfPreviewProgress(0);
    setPdfPreviewStage("idle");
  };

  const handleGeneratePdfPreview = () => {
    setExactPdfUrl((currentUrl) => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
      return null;
    });

    const optionsSnapshot = {
      ...pdfOptions,
      margins: pdfOptions.margins ? { ...pdfOptions.margins } : undefined,
    };

    setPdfPreviewPayload({
      markdown: content,
      options: optionsSnapshot,
    });
    setPreviewMode("pdf");
    setIsExactPdfLoading(true);
    setPdfPreviewProgress(8);
    setDisplayPdfPreviewProgress(8);
    setPdfPreviewStage("queued");
    setPdfPreviewVersion((value) => value + 1);
  };

  const format = (pdfOptions.format as keyof typeof PAGE_DIMENSIONS) || "a4";
  const pageDimensions = PAGE_DIMENSIONS[format];
  const mdPageColor = pdfOptions.pageColor || "#ffffff";
  const autoTextContrast = pdfOptions.autoTextContrast ?? true;
  const isDarkPageColor = isDarkHexColor(mdPageColor);
  const mdTextColor =
    autoTextContrast && isDarkPageColor ? "#e2e8f0" : "#0f172a";
  const mdMutedTextColor =
    autoTextContrast && isDarkPageColor ? "#94a3b8" : "#64748b";
  const mdLinkColor =
    autoTextContrast && isDarkPageColor ? "#93c5fd" : "#2563eb";
  const mdCodeBgColor =
    autoTextContrast && isDarkPageColor
      ? "rgba(148, 163, 184, 0.22)"
      : "rgba(148, 163, 184, 0.18)";
  const mdBlockBgColor =
    autoTextContrast && isDarkPageColor ? "#0f172a" : "#f8fafc";
  const mdBorderColor =
    autoTextContrast && isDarkPageColor ? "#334155" : "#cbd5e1";
  const mdTableAltBg =
    autoTextContrast && isDarkPageColor
      ? "rgba(148, 163, 184, 0.08)"
      : "rgba(148, 163, 184, 0.08)";
  const isPdfPreviewOutdated =
    previewMode === "pdf" &&
    !!pdfPreviewPayload &&
    (content !== pdfPreviewPayload.markdown ||
      JSON.stringify(pdfOptions) !== JSON.stringify(pdfPreviewPayload.options));

  // Calculate actual content dimensions (matching backend exactly)
  const pageWidth = pageDimensions.width;
  const pageHeight = pageDimensions.height;
  // Content area is page minus PDF margin and body padding (matching backend PDF)
  const contentAreaHeight = pageHeight - TOTAL_PADDING * 2;

  // Dynamic zoom based on container width (only if no manual zoom)
  useEffect(() => {
    if (!scrollContainerRef.current || manualScale !== null) return;

    const updateScale = () => {
      if (!scrollContainerRef.current) return;

      const containerWidth = scrollContainerRef.current.clientWidth;
      const availableWidth = containerWidth - PREVIEW_GAP * 2;
      const calculatedScale = Math.min(availableWidth / pageWidth, 1);

      setScale(Math.max(0.1, calculatedScale)); // Minimum 10% scale
    };

    updateScale();

    const resizeObserver = new ResizeObserver(updateScale);
    resizeObserver.observe(scrollContainerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [pageWidth, manualScale]);

  // Calculate approximate page count for header info (no visual page breaks in MD mode)
  useEffect(() => {
    const calculatePageCount = () => {
      if (!contentRef.current || !html) {
        setPageCount(1);
        return;
      }

      const actualHeight = contentRef.current.scrollHeight;
      const calculatedPages = Math.ceil(actualHeight / contentAreaHeight);
      setPageCount(Math.max(1, calculatedPages));
    };

    const timer = setTimeout(calculatePageCount, 100);
    const delayedTimer = setTimeout(calculatePageCount, 700);

    return () => {
      clearTimeout(timer);
      clearTimeout(delayedTimer);
    };
  }, [html, mermaidDiagrams, contentAreaHeight]);

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-slate-100 dark:bg-slate-900 relative">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 sm:px-4 py-2">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate whitespace-nowrap">
                {pageDimensions.label}
              </span>
            </div>
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-600" />
            <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
              {pageCount} {pageCount === 1 ? "page" : "pages"}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap xl:justify-end min-w-0">
            <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-700 rounded-md p-1 w-full sm:w-auto justify-center sm:justify-start shrink-0">
              <Button
                variant={previewMode === "markdown" ? "secondary" : "ghost"}
                size="xs"
                onClick={handleSwitchToMarkdownPreview}
              >
                MD Preview
              </Button>
              <Button
                variant={previewMode === "pdf" ? "secondary" : "ghost"}
                size="xs"
                onClick={handleGeneratePdfPreview}
                disabled={isExactPdfLoading}
              >
                {isExactPdfLoading ? "Rendering PDF..." : "PDF Preview"}
              </Button>
            </div>
            {isPdfPreviewOutdated && !isExactPdfLoading && (
              <span className="text-[10px] uppercase tracking-wide text-amber-600 dark:text-amber-400">
                Preview outdated · re-click PDF Preview
              </span>
            )}
            {previewMode === "pdf" && isExactPdfLoading && (
              <span className="text-[10px] uppercase tracking-wide text-blue-600 dark:text-blue-400 whitespace-nowrap">
                {Math.round(displayPdfPreviewProgress)}% · {pdfPreviewStage}
              </span>
            )}
            <button
              type="button"
              onClick={() =>
                updatePdfOptions({ autoTextContrast: !autoTextContrast })
              }
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors shrink-0"
              title="Toggle auto text contrast"
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${autoTextContrast ? "bg-emerald-500" : "bg-slate-400"}`}
              />
              <span className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 whitespace-nowrap">
                Auto Contrast: {autoTextContrast ? "On" : "Off"}
              </span>
            </button>
            <span
              className="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline"
              title="Use Ctrl+Scroll to zoom in/out"
            >
              {Math.round(scale * 100)}% zoom
            </span>
            <div className="inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 p-1 shrink-0">
              <Button size="xs" variant="ghost" onClick={handleFitWidthZoom}>
                Fit width
              </Button>
              <Button
                size="xs"
                variant="ghost"
                onClick={handleHundredPercentZoom}
              >
                100%
              </Button>
              <Button size="xs" variant="ghost" onClick={handleFitPageZoom}>
                Fit page
              </Button>
            </div>
            {manualScale !== null && (
              <button
                onClick={() => {
                  setManualScale(null);
                }}
                className="text-xs px-2 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 transition-colors"
                title="Reset to auto-fit zoom"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Zoom Indicator - Fixed to viewport */}
      {showZoomIndicator && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
          <div className="bg-slate-900/90 dark:bg-slate-100/90 text-white dark:text-slate-900 px-6 py-3 rounded-lg shadow-lg">
            <div className="text-3xl font-bold text-center">
              {Math.round(scale * 100)}%
            </div>
            <div className="text-xs text-center mt-1 opacity-75">
              Ctrl+Scroll to zoom
            </div>
          </div>
        </div>
      )}

      {/* Preview Area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain relative bg-slate-100 dark:bg-slate-900"
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        <div
          style={{
            minHeight: "100%",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            padding: `${PREVIEW_GAP}px`,
          }}
        >
          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "top center",
              transition: "transform 0.2s ease-out",
              width: `${pageWidth}px`,
            }}
          >
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-blue-500"></div>
                  <span className="text-sm text-slate-500">
                    Rendering preview...
                  </span>
                </div>
              </div>
            ) : previewMode === "pdf" && exactPdfUrl ? (
              <div
                ref={pageContainerRef}
                className="bg-white dark:bg-slate-800 shadow-lg relative"
                style={{
                  width: `${pageWidth}px`,
                  minHeight: `${pageHeight}px`,
                }}
              >
                <iframe
                  title="Exact PDF Preview"
                  src={`${exactPdfUrl}#toolbar=0&navpanes=0&view=FitH`}
                  className="w-full border-0"
                  style={{
                    height: `${Math.max(pageHeight * pageCount, pageHeight)}px`,
                    background: "white",
                  }}
                />
              </div>
            ) : previewMode === "pdf" ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-3">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Click PDF Preview to generate exact PDF rendering.
                  </span>
                </div>
              </div>
            ) : (
              <div
                ref={pageContainerRef}
                style={{
                  width: `${pageWidth}px`,
                }}
              >
                {[0].map((_, pageIndex) => (
                  <div
                    key={pageIndex}
                    className="shadow-lg relative"
                    style={{
                      width: `${pageWidth}px`,
                      minHeight: `${pageHeight}px`,
                      boxSizing: "border-box",
                      padding: `${PDF_MARGIN_PX}px`,
                      backgroundColor: mdPageColor,
                    }}
                  >
                    <div
                      data-md-preview-theme="true"
                      style={{
                        minHeight: `${pageHeight - PDF_MARGIN_PX * 2}px`,
                        boxSizing: "border-box",
                        padding: `${BODY_PADDING_PX}px`,
                        backgroundColor: "transparent",
                        color: mdTextColor,
                        ["--md-muted-color" as string]: mdMutedTextColor,
                        ["--md-link-color" as string]: mdLinkColor,
                        ["--md-code-bg-color" as string]: mdCodeBgColor,
                        ["--md-block-bg-color" as string]: mdBlockBgColor,
                        ["--md-border-color" as string]: mdBorderColor,
                        ["--md-table-alt-bg" as string]: mdTableAltBg,
                      }}
                    >
                      <style>
                        {`[data-md-preview-theme="true"] h6,
[data-md-preview-theme="true"] blockquote { color: var(--md-muted-color) !important; }
[data-md-preview-theme="true"] h1,
[data-md-preview-theme="true"] h2,
[data-md-preview-theme="true"] h3,
[data-md-preview-theme="true"] h4,
[data-md-preview-theme="true"] h5,
[data-md-preview-theme="true"] h6,
[data-md-preview-theme="true"] p,
[data-md-preview-theme="true"] li,
[data-md-preview-theme="true"] td,
[data-md-preview-theme="true"] th { color: inherit !important; }
[data-md-preview-theme="true"] a { color: var(--md-link-color) !important; }
[data-md-preview-theme="true"] code { background: var(--md-code-bg-color) !important; }
[data-md-preview-theme="true"] pre {
  background: var(--md-block-bg-color) !important;
  border-color: var(--md-border-color) !important;
}
[data-md-preview-theme="true"] pre code { background: transparent !important; color: inherit !important; }
[data-md-preview-theme="true"] table th {
  background: var(--md-block-bg-color) !important;
  border-color: var(--md-border-color) !important;
}
[data-md-preview-theme="true"] table td,
[data-md-preview-theme="true"] table tr {
  border-color: var(--md-border-color) !important;
  background: transparent !important;
}
[data-md-preview-theme="true"] table tr:nth-child(even) {
  background: var(--md-table-alt-bg) !important;
}
[data-md-preview-theme="true"] blockquote {
  border-left-color: var(--md-border-color) !important;
}
[data-md-preview-theme="true"] .mermaid,
[data-md-preview-theme="true"] .mermaid svg,
[data-md-preview-theme="true"] .mermaid-container {
  background: transparent !important;
}`}
                      </style>
                      <div>
                        <div
                          ref={contentRef}
                          className="relative"
                          style={{
                            fontFamily:
                              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                            lineHeight: "1.6",
                          }}
                        >
                          {/* Render HTML with interspersed Mermaid diagrams */}
                          {(() => {
                            if (mermaidDiagrams.length === 0) {
                              return (
                                <div
                                  className="
                          [&>h1]:text-[2em] [&>h1]:font-semibold [&>h1]:mt-6 [&>h1]:mb-4 [&>h1]:leading-tight [&>h1]:border-b [&>h1]:border-slate-200 dark:[&>h1]:border-slate-700 [&>h1]:pb-1.5
                          [&>h2]:text-[1.5em] [&>h2]:font-semibold [&>h2]:mt-6 [&>h2]:mb-4 [&>h2]:leading-tight [&>h2]:border-b [&>h2]:border-slate-200 dark:[&>h2]:border-slate-700 [&>h2]:pb-1.5
                          [&>h3]:text-[1.25em] [&>h3]:font-semibold [&>h3]:mt-6 [&>h3]:mb-4 [&>h3]:leading-tight
                          [&>h4]:text-[1em] [&>h4]:font-semibold [&>h4]:mt-6 [&>h4]:mb-4
                          [&>h5]:text-[0.875em] [&>h5]:font-semibold [&>h5]:mt-6 [&>h5]:mb-4
                          [&>h6]:text-[0.85em] [&>h6]:font-semibold [&>h6]:mt-6 [&>h6]:mb-4 [&>h6]:text-slate-600 dark:[&>h6]:text-slate-400
                          [&>p]:mt-0 [&>p]:mb-4
                          [&>pre]:bg-slate-50 dark:[&>pre]:bg-slate-900 [&>pre]:p-4 [&>pre]:rounded-md [&>pre]:overflow-x-auto [&>pre]:border [&>pre]:border-slate-200 dark:[&>pre]:border-slate-700 [&>pre]:mb-4 [&>pre]:text-[85%]
                          [&>pre>code]:bg-transparent [&>pre>code]:p-0 [&>pre>code]:rounded-none
                          [&_code]:font-mono [&_code]:text-[85%] [&_code]:bg-slate-100 dark:[&_code]:bg-slate-700 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded
                          [&>blockquote]:border-l-4 [&>blockquote]:border-slate-300 dark:[&>blockquote]:border-slate-600 [&>blockquote]:pl-4 [&>blockquote]:my-0 [&>blockquote]:mr-0 [&>blockquote]:text-slate-600 dark:[&>blockquote]:text-slate-400
                          [&>ul]:pl-8 [&>ul]:mt-0 [&>ul]:mb-4
                          [&>ol]:pl-8 [&>ol]:mt-0 [&>ol]:mb-4
                          [&_li]:mb-1
                          [&>table]:w-full [&>table]:border-collapse [&>table]:mt-0 [&>table]:mb-4
                          [&_th]:border [&_th]:border-slate-300 dark:[&_th]:border-slate-600 [&_th]:px-3 [&_th]:py-1.5 [&_th]:bg-slate-50 dark:[&_th]:bg-slate-700 [&_th]:font-semibold [&_th]:text-left
                          [&_td]:border [&_td]:border-slate-300 dark:[&_td]:border-slate-600 [&_td]:px-3 [&_td]:py-1.5
                          [&_tr]:bg-white dark:[&_tr]:bg-slate-800 [&_tr]:border-t [&_tr]:border-slate-300 dark:[&_tr]:border-slate-600
                          [&_tr:nth-child(even)]:bg-slate-50 dark:[&_tr:nth-child(even)]:bg-slate-700/50
                          [&_a]:text-blue-600 dark:[&_a]:text-blue-400 [&_a]:underline
                          [&>hr]:border-0 [&>hr]:border-t [&>hr]:border-slate-300 dark:[&>hr]:border-slate-700 [&>hr]:my-6
                          [&>img]:max-w-full [&>img]:my-4"
                                  dangerouslySetInnerHTML={{ __html: html }}
                                />
                              );
                            }

                            // Split HTML by mermaid placeholders
                            const parts: React.ReactNode[] = [];
                            let remainingHtml = html;

                            mermaidDiagrams.forEach((diagram, index) => {
                              const placeholder = `<div class="mermaid-diagram" data-chart="${encodeURIComponent(diagram.code)}" data-id="${diagram.id}"></div>`;
                              const [before, after] =
                                remainingHtml.split(placeholder);

                              if (before) {
                                parts.push(
                                  <div
                                    key={`html-${index}`}
                                    className="
                            [&>h1]:text-[2em] [&>h1]:font-semibold [&>h1]:mt-6 [&>h1]:mb-4 [&>h1]:leading-tight [&>h1]:border-b [&>h1]:border-slate-200 dark:[&>h1]:border-slate-700 [&>h1]:pb-1.5
                            [&>h2]:text-[1.5em] [&>h2]:font-semibold [&>h2]:mt-6 [&>h2]:mb-4 [&>h2]:leading-tight [&>h2]:border-b [&>h2]:border-slate-200 dark:[&>h2]:border-slate-700 [&>h2]:pb-1.5
                            [&>h3]:text-[1.25em] [&>h3]:font-semibold [&>h3]:mt-6 [&>h3]:mb-4 [&>h3]:leading-tight
                            [&>h4]:text-[1em] [&>h4]:font-semibold [&>h4]:mt-6 [&>h4]:mb-4
                            [&>h5]:text-[0.875em] [&>h5]:font-semibold [&>h5]:mt-6 [&>h5]:mb-4
                            [&>h6]:text-[0.85em] [&>h6]:font-semibold [&>h6]:mt-6 [&>h6]:mb-4 [&>h6]:text-slate-600 dark:[&>h6]:text-slate-400
                            [&>p]:mt-0 [&>p]:mb-4
                            [&>pre]:bg-slate-50 dark:[&>pre]:bg-slate-900 [&>pre]:p-4 [&>pre]:rounded-md [&>pre]:overflow-x-auto [&>pre]:border [&>pre]:border-slate-200 dark:[&>pre]:border-slate-700 [&>pre]:mb-4 [&>pre]:text-[85%]
                            [&>pre>code]:bg-transparent [&>pre>code]:p-0 [&>pre>code]:rounded-none
                            [&_code]:font-mono [&_code]:text-[85%] [&_code]:bg-slate-100 dark:[&_code]:bg-slate-700 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded
                            [&>blockquote]:border-l-4 [&>blockquote]:border-slate-300 dark:[&>blockquote]:border-slate-600 [&>blockquote]:pl-4 [&>blockquote]:my-0 [&>blockquote]:mr-0 [&>blockquote]:text-slate-600 dark:[&>blockquote]:text-slate-400
                            [&>ul]:pl-8 [&>ul]:mt-0 [&>ul]:mb-4
                            [&>ol]:pl-8 [&>ol]:mt-0 [&>ol]:mb-4
                            [&_li]:mb-1
                            [&>table]:w-full [&>table]:border-collapse [&>table]:mt-0 [&>table]:mb-4
                            [&_th]:border [&_th]:border-slate-300 dark:[&_th]:border-slate-600 [&_th]:px-3 [&_th]:py-1.5 [&_th]:bg-slate-50 dark:[&_th]:bg-slate-700 [&_th]:font-semibold [&_th]:text-left
                            [&_td]:border [&_td]:border-slate-300 dark:[&_td]:border-slate-600 [&_td]:px-3 [&_td]:py-1.5
                            [&_tr]:bg-white dark:[&_tr]:bg-slate-800 [&_tr]:border-t [&_tr]:border-slate-300 dark:[&_tr]:border-slate-600
                            [&_tr:nth-child(even)]:bg-slate-50 dark:[&_tr:nth-child(even)]:bg-slate-700/50
                            [&_a]:text-blue-600 dark:[&_a]:text-blue-400 [&_a]:underline
                            [&>hr]:border-0 [&>hr]:border-t [&>hr]:border-slate-300 dark:[&>hr]:border-slate-700 [&>hr]:my-6
                            [&>img]:max-w-full [&>img]:my-4"
                                    dangerouslySetInnerHTML={{ __html: before }}
                                  />,
                                );
                              }

                              parts.push(
                                <div
                                  key={`mermaid-wrapper-${diagram.id}`}
                                  className="break-inside-avoid"
                                >
                                  <MermaidRenderer
                                    id={diagram.id}
                                    chart={diagram.code}
                                    forceDarkMode={
                                      autoTextContrast && isDarkPageColor
                                    }
                                  />
                                </div>,
                              );

                              remainingHtml = after || "";
                            });

                            if (remainingHtml) {
                              parts.push(
                                <div
                                  key="html-final"
                                  className="
                          [&>h1]:text-[2em] [&>h1]:font-semibold [&>h1]:mt-6 [&>h1]:mb-4 [&>h1]:leading-tight [&>h1]:border-b [&>h1]:border-slate-200 dark:[&>h1]:border-slate-700 [&>h1]:pb-1.5
                          [&>h2]:text-[1.5em] [&>h2]:font-semibold [&>h2]:mt-6 [&>h2]:mb-4 [&>h2]:leading-tight [&>h2]:border-b [&>h2]:border-slate-200 dark:[&>h2]:border-slate-700 [&>h2]:pb-1.5
                          [&>h3]:text-[1.25em] [&>h3]:font-semibold [&>h3]:mt-6 [&>h3]:mb-4 [&>h3]:leading-tight
                          [&>h4]:text-[1em] [&>h4]:font-semibold [&>h4]:mt-6 [&>h4]:mb-4
                          [&>h5]:text-[0.875em] [&>h5]:font-semibold [&>h5]:mt-6 [&>h5]:mb-4
                          [&>h6]:text-[0.85em] [&>h6]:font-semibold [&>h6]:mt-6 [&>h6]:mb-4 [&>h6]:text-slate-600 dark:[&>h6]:text-slate-400
                          [&>p]:mt-0 [&>p]:mb-4
                          [&>pre]:bg-slate-50 dark:[&>pre]:bg-slate-900 [&>pre]:p-4 [&>pre]:rounded-md [&>pre]:overflow-x-auto [&>pre]:border [&>pre]:border-slate-200 dark:[&>pre]:border-slate-700 [&>pre]:mb-4 [&>pre]:text-[85%]
                          [&>pre>code]:bg-transparent [&>pre>code]:p-0 [&>pre>code]:rounded-none
                          [&_code]:font-mono [&_code]:text-[85%] [&_code]:bg-slate-100 dark:[&_code]:bg-slate-700 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded
                          [&>blockquote]:border-l-4 [&>blockquote]:border-slate-300 dark:[&>blockquote]:border-slate-600 [&>blockquote]:pl-4 [&>blockquote]:my-0 [&>blockquote]:mr-0 [&>blockquote]:text-slate-600 dark:[&>blockquote]:text-slate-400
                          [&>ul]:pl-8 [&>ul]:mt-0 [&>ul]:mb-4
                          [&>ol]:pl-8 [&>ol]:mt-0 [&>ol]:mb-4
                          [&_li]:mb-1
                          [&>table]:w-full [&>table]:border-collapse [&>table]:mt-0 [&>table]:mb-4
                          [&_th]:border [&_th]:border-slate-300 dark:[&_th]:border-slate-600 [&_th]:px-3 [&_th]:py-1.5 [&_th]:bg-slate-50 dark:[&_th]:bg-slate-700 [&_th]:font-semibold [&_th]:text-left
                          [&_td]:border [&_td]:border-slate-300 dark:[&_td]:border-slate-600 [&_td]:px-3 [&_td]:py-1.5
                          [&_tr]:bg-white dark:[&_tr]:bg-slate-800 [&_tr]:border-t [&_tr]:border-slate-300 dark:[&_tr]:border-slate-600
                          [&_tr:nth-child(even)]:bg-slate-50 dark:[&_tr:nth-child(even)]:bg-slate-700/50
                          [&_a]:text-blue-600 dark:[&_a]:text-blue-400 [&_a]:underline
                          [&>hr]:border-0 [&>hr]:border-t [&>hr]:border-slate-300 dark:[&>hr]:border-slate-700 [&>hr]:my-6
                          [&>img]:max-w-full [&>img]:my-4"
                                  dangerouslySetInnerHTML={{
                                    __html: remainingHtml,
                                  }}
                                />,
                              );
                            }

                            return parts;
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {previewMode === "pdf" && isExactPdfLoading && (
          <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center bg-slate-900/15 dark:bg-slate-950/30 backdrop-blur-[2px]">
            <div className="flex flex-col items-center gap-3 rounded-xl px-6 py-5 bg-white/90 dark:bg-slate-900/85 shadow-xl">
              <div
                className="relative h-20 w-20 rounded-full"
                style={{
                  background: `conic-gradient(#3b82f6 ${Math.max(displayPdfPreviewProgress, 8) * 3.6}deg, rgba(148,163,184,0.25) 0deg)`,
                }}
              >
                <div className="absolute inset-2 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center">
                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {Math.round(displayPdfPreviewProgress)}%
                  </div>
                </div>
              </div>
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {pdfPreviewStage === "completed"
                  ? "finalizing"
                  : pdfPreviewStage || "rendering"}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
