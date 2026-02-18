"use client";

import Link from "next/link";
import { CheckCircle2, Home, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useExportStore } from "@/stores/export-store";
import { ThemeToggle } from "@/components/theme-toggle";
import { ExportDialog } from "@/components/export/export-dialog";
import type { UploadMarkdownFileHandler } from "@/types/upload";
import { PageFormatSelector } from "./page-format-selector";
import { PageColorSelector } from "./page-color-selector";
import { UploadMarkdownButton } from "./upload-markdown-button";

interface HeaderProps {
  filename?: string;
  onExport?: (filename: string, format: "pdf" | "html" | "md") => void;
  onUploadMarkdownFile?: UploadMarkdownFileHandler;
  showExport?: boolean;
  showPdfSettings?: boolean;
  autoSaveStatus?: "saving" | "saved";
  lastSavedAt?: Date | null;
}

export function Header({
  filename,
  onExport,
  onUploadMarkdownFile,
  showExport = false,
  showPdfSettings = false,
  autoSaveStatus,
  lastSavedAt,
}: HeaderProps) {
  const { pdfOptions, updatePdfOptions } = useExportStore();
  const pageNumbersEnabled = pdfOptions.showHeaderFooter ?? false;
  const pageNumberAlign = pdfOptions.pageNumberAlign ?? "center";

  const savedTimeLabel = lastSavedAt
    ? new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(lastSavedAt)
    : null;

  return (
    <header className="min-h-14 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center sm:justify-between px-3 sm:px-4 py-2 gap-2">
      <div className="flex items-center gap-3 min-w-0">
        <Link
          href="/"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <Home className="w-5 h-5" />
          <span className="font-bold text-lg">
            Dry<span className="text-blue-600 dark:text-blue-400">MDF</span>
          </span>
        </Link>
        {filename && (
          <span className="text-sm text-slate-600 dark:text-slate-400 truncate max-w-45 sm:max-w-[320px]">
            {filename}
          </span>
        )}
        {autoSaveStatus && (
          <div className="hidden md:inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1">
            {autoSaveStatus === "saving" ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin text-slate-500 dark:text-slate-400" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            )}
            <span className="text-[11px] text-slate-600 dark:text-slate-300 whitespace-nowrap">
              {autoSaveStatus === "saving"
                ? "Saving..."
                : savedTimeLabel
                  ? `Auto-saved ${savedTimeLabel}`
                  : "Auto-saved"}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap justify-end w-full sm:w-auto">
        {onUploadMarkdownFile && (
          <UploadMarkdownButton onUploadMarkdownFile={onUploadMarkdownFile} />
        )}
        {showExport && (
          <>
            {showPdfSettings && (
              <>
                <PageFormatSelector />
                <PageColorSelector />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant={pageNumbersEnabled ? "secondary" : "outline"}
                      size="sm"
                      className="h-9 gap-1.5 px-2 sm:px-3 text-xs font-medium"
                      title="Page numbering options"
                    >
                      <span className="hidden min-[420px]:inline">
                        Page Numbering
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="text-xs text-slate-500 dark:text-slate-400">
                      Page Numbering
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs text-slate-500 dark:text-slate-400">
                      Status
                    </DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={pageNumbersEnabled ? "enabled" : "disabled"}
                      onValueChange={(value) =>
                        updatePdfOptions({
                          showHeaderFooter: value === "enabled",
                        })
                      }
                    >
                      <DropdownMenuRadioItem
                        value="enabled"
                        className="data-[state=checked]:text-emerald-600 dark:data-[state=checked]:text-emerald-400"
                      >
                        Enable
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem
                        value="disabled"
                        className="data-[state=checked]:text-rose-600 dark:data-[state=checked]:text-rose-400"
                      >
                        Disable
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs text-slate-500 dark:text-slate-400">
                      Alignment
                    </DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={pageNumberAlign}
                      onValueChange={(value) =>
                        updatePdfOptions({
                          pageNumberAlign: value as "left" | "center" | "right",
                        })
                      }
                    >
                      <DropdownMenuRadioItem
                        value="left"
                        disabled={!pageNumbersEnabled}
                      >
                        Left
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem
                        value="center"
                        disabled={!pageNumbersEnabled}
                      >
                        Center
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem
                        value="right"
                        disabled={!pageNumbersEnabled}
                      >
                        Right
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
            {onExport && (
              <ExportDialog
                onExport={onExport}
                initialFilename={filename || "document"}
              />
            )}
          </>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}
