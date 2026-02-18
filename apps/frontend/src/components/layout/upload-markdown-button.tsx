"use client";

import { useRef } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UploadMarkdownFileHandler } from "@/types/upload";

interface UploadMarkdownButtonProps {
  onUploadMarkdownFile: UploadMarkdownFileHandler;
}

export function UploadMarkdownButton({
  onUploadMarkdownFile,
}: UploadMarkdownButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,text/markdown"
        className="sr-only"
        onChange={(event) => {
          const selectedFile = event.target.files?.[0];
          if (!selectedFile) {
            return;
          }

          onUploadMarkdownFile(selectedFile);
          event.currentTarget.value = "";
        }}
      />
      <Button
        variant="outline"
        size="sm"
        className="group relative h-9 gap-1.5 px-2 sm:px-3 text-xs font-medium"
        aria-label="Upload md file"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="h-4 w-4" />
        <span className="hidden min-[420px]:inline">Upload</span>
        <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 -translate-x-1/2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 opacity-0 shadow-sm transition-opacity duration-100 group-hover:opacity-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
          Upload md file
        </span>
      </Button>
    </>
  );
}
