"use client";

import { useEffect } from "react";
import { useExportStore } from "@/stores/export-store";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

interface ExportProgressProps {
  stage: string;
  progress: number;
  message?: string;
}

export function ExportProgress({
  stage,
  progress,
  message,
}: ExportProgressProps) {
  const { setProgress } = useExportStore();

  useEffect(() => {
    setProgress(progress, stage);
  }, [progress, stage, setProgress]);

  const getIcon = () => {
    if (stage === "completed") {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    if (stage === "failed") {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
    return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
  };

  const getStageLabel = () => {
    switch (stage) {
      case "parsing":
        return "Parsing markdown...";
      case "generating":
        return "Generating PDF...";
      case "completed":
        return "Export completed!";
      case "failed":
        return "Export failed";
      default:
        return "Processing...";
    }
  };

  return (
    <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
      {getIcon()}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {getStageLabel()}
          </span>
          <span className="text-sm text-slate-500">{progress}%</span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        {message && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
