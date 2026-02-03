"use client";

import Link from "next/link";
import { FileDown, Home } from "lucide-react";

export function Header() {
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
      </div>

      <div className="flex items-center gap-2">
        <button
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors flex items-center gap-2"
          onClick={() => {
            // TODO: Implement export
            console.log("Export clicked");
          }}
        >
          <FileDown className="w-4 h-4" />
          Export PDF
        </button>
      </div>
    </header>
  );
}
