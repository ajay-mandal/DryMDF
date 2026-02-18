"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api/client";
import { useJobProgress } from "@/hooks/use-job-progress";
import type { PdfOptions } from "@/types/pdf";
import {
  DEFAULT_PREVIEW_FORMAT,
  PAGE_DIMENSIONS,
  PREVIEW_GAP,
} from "./preview-config";

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

interface PdfPreviewPaneProps {
  request: {
    id: number;
    content: string;
    options: PdfOptions;
  } | null;
  currentPdfOptions: PdfOptions;
  updatePdfOptions: (options: Partial<PdfOptions>) => void;
}

export function PdfPreviewPane({
  request,
  currentPdfOptions,
  updatePdfOptions,
}: PdfPreviewPaneProps) {
  const effectivePdfOptions = request?.options ?? currentPdfOptions;
  const format =
    (effectivePdfOptions.format as keyof typeof PAGE_DIMENSIONS) ||
    DEFAULT_PREVIEW_FORMAT;
  const pageDimensions = PAGE_DIMENSIONS[format];
  const pageWidth = pageDimensions.width;
  const pageHeight = pageDimensions.height;

  const [scale, setScale] = useState(1);
  const [manualScale, setManualScale] = useState<number | null>(null);
  const [showZoomIndicator, setShowZoomIndicator] = useState(false);
  const [exactPdfUrl, setExactPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [stage, setStage] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [socketClientId, setSocketClientId] = useState("");
  const [isZoomModifierActive, setIsZoomModifierActive] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const exactPdfRequestRef = useRef(0);
  const zoomTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const autoTextContrast = effectivePdfOptions.autoTextContrast ?? true;
  const isDarkPageColor = isDarkHexColor(
    effectivePdfOptions.pageColor ?? "#ffffff",
  );
  const { progress: wsProgress } = useJobProgress(socketClientId);

  useEffect(() => {
    if (!isLoading || !wsProgress) {
      return;
    }

    const wsProgressValue = Math.min(Math.max(wsProgress.progress, 0), 100);
    setProgress((current) =>
      wsProgressValue > current ? wsProgressValue : current,
    );
    setStage(wsProgress.stage || "processing");
  }, [isLoading, wsProgress]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    const handleWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey || e.altKey)) {
        return;
      }

      e.preventDefault();
      const delta = -e.deltaY;
      const zoomIntensity = 0.001;

      setScale((currentScale) => {
        const newScale = currentScale * (1 + delta * zoomIntensity);
        const clampedScale = Math.min(Math.max(newScale, 0.1), 2);
        setManualScale(clampedScale);
        return clampedScale;
      });

      setShowZoomIndicator(true);
      if (zoomTimeoutRef.current) {
        clearTimeout(zoomTimeoutRef.current);
      }
      zoomTimeoutRef.current = setTimeout(() => {
        setShowZoomIndicator(false);
      }, 1800);
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
    const updateModifierState = (event: KeyboardEvent) => {
      setIsZoomModifierActive(event.ctrlKey || event.metaKey || event.altKey);
    };

    const resetModifierState = () => {
      setIsZoomModifierActive(false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        resetModifierState();
      }
    };

    window.addEventListener("keydown", updateModifierState);
    window.addEventListener("keyup", updateModifierState);
    window.addEventListener("blur", resetModifierState);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("keydown", updateModifierState);
      window.removeEventListener("keyup", updateModifierState);
      window.removeEventListener("blur", resetModifierState);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!scrollContainerRef.current || manualScale !== null) {
      return;
    }

    const updateScale = () => {
      if (!scrollContainerRef.current) {
        return;
      }

      const availableWidth =
        scrollContainerRef.current.clientWidth - PREVIEW_GAP * 2;
      const calculatedScale = Math.min(availableWidth / pageWidth, 1);
      setScale(Math.max(0.1, calculatedScale));
    };

    updateScale();
    const resizeObserver = new ResizeObserver(updateScale);
    resizeObserver.observe(scrollContainerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [pageWidth, manualScale]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setDisplayProgress((current) => {
        const delta = progress - current;
        if (Math.abs(delta) < 0.2) {
          window.clearInterval(timer);
          return progress;
        }

        const easing = delta > 0 ? 0.16 : 0.28;
        return current + delta * easing;
      });
    }, 16);

    return () => {
      window.clearInterval(timer);
    };
  }, [progress]);

  useEffect(() => {
    if (!request) {
      setIsLoading(false);
      setProgress(0);
      setDisplayProgress(0);
      setStage("idle");
      return;
    }

    if (!request.content.trim()) {
      setExactPdfUrl((currentUrl) => {
        if (currentUrl) {
          URL.revokeObjectURL(currentUrl);
        }
        return null;
      });
      setIsLoading(false);
      setProgress(0);
      setStage("idle");
      return;
    }

    let cancelled = false;
    const requestId = ++exactPdfRequestRef.current;

    const base64ToPdfBlobUrl = (base64: string): string => {
      const binaryString = window.atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let index = 0; index < binaryString.length; index += 1) {
        bytes[index] = binaryString.charCodeAt(index);
      }

      const blob = new Blob([bytes], { type: "application/pdf" });
      return URL.createObjectURL(blob);
    };

    const run = async () => {
      setIsLoading(true);
      setProgress(8);
      setDisplayProgress(8);
      setStage("queued");

      try {
        const clientId = `preview-${requestId}-${Date.now()}`;
        setSocketClientId(clientId);

        const queuedJob = await apiClient.convertToPdf(
          request.content,
          clientId,
          request.options,
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

          setProgress(progressValue);
          setStage(status.status);

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

            setProgress(100);
            setStage("completed");
            setIsLoading(false);
            setSocketClientId("");
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
        setProgress(0);
        setStage("failed");
        setIsLoading(false);
        setSocketClientId("");
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [request]);

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

  const showZoomFeedback = () => {
    setShowZoomIndicator(true);
    if (zoomTimeoutRef.current) {
      clearTimeout(zoomTimeoutRef.current);
    }
    zoomTimeoutRef.current = setTimeout(() => {
      setShowZoomIndicator(false);
    }, 1800);
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

  return (
    <div className="h-full min-h-0 w-full flex flex-col overflow-hidden bg-slate-100 dark:bg-slate-900 relative">
      <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 sm:px-4 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
              {pageDimensions.label}
            </span>
            <span className="text-[10px] uppercase tracking-wide text-blue-600 dark:text-blue-400 whitespace-nowrap">
              {Math.round(displayProgress)}% · {stage}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
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
              title="Use Ctrl/⌘/Alt + Scroll to zoom in/out"
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
                onClick={() => setManualScale(null)}
                className="text-xs px-2 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 transition-colors"
                title="Reset to auto-fit zoom"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {showZoomIndicator && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
          <div className="bg-slate-900/90 dark:bg-slate-100/90 text-white dark:text-slate-900 px-6 py-3 rounded-lg shadow-lg">
            <div className="text-3xl font-bold text-center">
              {Math.round(scale * 100)}%
            </div>
            <div className="text-xs text-center mt-1 opacity-75">
              Ctrl/⌘/Alt + Scroll to zoom
            </div>
          </div>
        </div>
      )}

      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain relative bg-slate-100 dark:bg-slate-900"
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
              width: `${Math.max(pageWidth * scale, 1)}px`,
              transition: "width 0.2s ease-out, height 0.2s ease-out",
            }}
          >
            {exactPdfUrl ? (
              <div
                className="bg-white dark:bg-slate-800 shadow-lg relative"
                style={{
                  width: "100%",
                  minHeight: `${Math.max(pageHeight * scale, 1)}px`,
                }}
              >
                <iframe
                  title="Exact PDF Preview"
                  src={`${exactPdfUrl}#toolbar=0&navpanes=0&view=FitH`}
                  className="w-full border-0"
                  style={{
                    height: `${Math.max(pageHeight * scale, 1)}px`,
                    background:
                      isDarkPageColor && autoTextContrast ? "#0f172a" : "white",
                  }}
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 z-20"
                  style={{
                    pointerEvents: isZoomModifierActive ? "auto" : "none",
                    cursor: isZoomModifierActive ? "zoom-in" : "default",
                  }}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center py-16">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {!request
                    ? "Click PDF Preview to render from backend."
                    : isLoading
                      ? "Rendering exact PDF preview..."
                      : "Waiting for preview generation..."}
                </span>
              </div>
            )}
          </div>
        </div>

        {isLoading && (
          <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center bg-slate-900/15 dark:bg-slate-950/30 backdrop-blur-[2px]">
            <div className="flex flex-col items-center gap-3 rounded-xl px-6 py-5 bg-white/90 dark:bg-slate-900/85 shadow-xl">
              <div
                className="relative h-20 w-20 rounded-full"
                style={{
                  background: `conic-gradient(#3b82f6 ${Math.max(displayProgress, 8) * 3.6}deg, rgba(148,163,184,0.25) 0deg)`,
                }}
              >
                <div className="absolute inset-2 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center">
                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {Math.round(displayProgress)}%
                  </div>
                </div>
              </div>
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {stage === "completed" ? "finalizing" : stage || "rendering"}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
