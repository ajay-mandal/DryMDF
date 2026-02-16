"use client";

import Link from "next/link";
import { Home } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { ExportDialog } from "@/components/export/export-dialog";
import { PageFormatSelector } from "./page-format-selector";

interface HeaderProps {
  filename?: string;
  onExport?: (filename: string) => void;
  showExport?: boolean;
}

export function Header({
  filename,
  onExport,
  showExport = false,
}: HeaderProps) {
  return (
    <header className="h-14 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <Home className="w-5 h-5" />
          <span className="font-bold text-lg">
            Dry<span className="text-blue-600 dark:text-blue-400">PDF</span>
          </span>
        </Link>
        {filename && (
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {filename}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {showExport && (
          <>
            <PageFormatSelector />
            {onExport && <ExportDialog onExport={onExport} />}
          </>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}
