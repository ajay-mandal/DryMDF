"use client";

import { FileText, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useExportStore } from "@/stores/export-store";

const PAGE_FORMATS = [
  { value: "a4", label: "A4", dimensions: "210 × 297 mm" },
  { value: "letter", label: "Letter", dimensions: '8.5" × 11"' },
  { value: "legal", label: "Legal", dimensions: '8.5" × 14"' },
] as const;

export function PageFormatSelector() {
  const { pdfOptions, updatePdfOptions } = useExportStore();

  const currentFormat = PAGE_FORMATS.find(
    (format) => format.value === pdfOptions.format,
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2 text-xs font-medium"
        >
          <FileText className="h-4 w-4" />
          <span>{currentFormat?.label || "A4"}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs text-slate-500 dark:text-slate-400">
          Page Format
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {PAGE_FORMATS.map((format) => (
          <DropdownMenuItem
            key={format.value}
            onClick={() => updatePdfOptions({ format: format.value })}
            className="cursor-pointer"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col">
                <span className="font-medium">{format.label}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {format.dimensions}
                </span>
              </div>
              {pdfOptions.format === format.value && (
                <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
