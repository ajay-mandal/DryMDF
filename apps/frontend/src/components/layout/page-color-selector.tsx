"use client";

import { Palette, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useExportStore } from "@/stores/export-store";

const PAGE_COLORS = [
  { value: "#ffffff", label: "White" },
  { value: "#fff7e6", label: "Cream" },
  { value: "#eaf4ff", label: "Sky" },
  { value: "#eefbf3", label: "Mint" },
] as const;

export function PageColorSelector() {
  const { pdfOptions, updatePdfOptions } = useExportStore();

  const currentColor =
    PAGE_COLORS.find((color) => color.value === pdfOptions.pageColor) ||
    PAGE_COLORS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 px-2 sm:px-3 text-xs font-medium"
        >
          <Palette className="h-4 w-4" />
          <span className="hidden min-[420px]:inline">
            {currentColor.label}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs text-slate-500 dark:text-slate-400">
          Page Color
        </DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          checked={pdfOptions.autoTextContrast ?? true}
          onCheckedChange={(checked) =>
            updatePdfOptions({ autoTextContrast: Boolean(checked) })
          }
          className="text-xs"
        >
          Auto text contrast
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        {PAGE_COLORS.map((color) => (
          <DropdownMenuItem
            key={color.value}
            onClick={() => updatePdfOptions({ pageColor: color.value })}
            className="cursor-pointer"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <span
                  className="h-5 w-5 rounded border-2 border-slate-400 dark:border-slate-300 shadow-sm"
                  style={{ backgroundColor: color.value }}
                />
                <div className="flex flex-col leading-tight">
                  <span className="font-medium">{color.label}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {color.value}
                  </span>
                </div>
              </div>
              {pdfOptions.pageColor === color.value && (
                <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
