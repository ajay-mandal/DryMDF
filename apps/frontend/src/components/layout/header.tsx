"use client";

import Link from "next/link";
import { Home } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { ExportDialog } from "@/components/export/export-dialog";
import { PageFormatSelector } from "./page-format-selector";
import { PageColorSelector } from "./page-color-selector";

interface HeaderProps {
  filename?: string;
  onExport?: (filename: string, format: "pdf" | "html" | "md") => void;
  showExport?: boolean;
  showPdfSettings?: boolean;
}

export function Header({
  filename,
  onExport,
  showExport = false,
  showPdfSettings = false,
}: HeaderProps) {
  return (
    <header className="min-h-14 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center sm:justify-between px-3 sm:px-4 py-2 gap-2">
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
      </div>

      <div className="flex items-center gap-2 flex-wrap justify-end w-full sm:w-auto">
        {showExport && (
          <>
            {showPdfSettings && (
              <>
                <PageFormatSelector />
                <PageColorSelector />
              </>
            )}
            {onExport && <ExportDialog onExport={onExport} />}
          </>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}
