"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useExportStore } from "@/stores/export-store";
import { FileDown, Loader2 } from "lucide-react";

type ExportFormat = "pdf" | "html" | "md";

interface ExportDialogProps {
  onExport: (filename: string, format: ExportFormat) => void;
  initialFilename?: string;
}

export function ExportDialog({
  onExport,
  initialFilename = "document",
}: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [filename, setFilename] = useState(initialFilename);
  const [format, setFormat] = useState<ExportFormat>("pdf");
  const { isExporting } = useExportStore();

  const extension =
    format === "pdf" ? ".pdf" : format === "html" ? ".html" : ".md";

  const handleExport = () => {
    onExport(filename || "document", format);
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          setFilename(initialFilename || "document");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          disabled={isExporting}
          className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700 px-2 sm:px-3"
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin min-[420px]:mr-2 " />
              <span className="hidden min-[420px]:inline">Exporting...</span>
            </>
          ) : (
            <>
              <FileDown className="h-4 w-4 min-[420px]:mr-2" />
              <span className="hidden min-[420px]:inline">Export</span>
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Document</DialogTitle>
          <DialogDescription>Choose format and filename.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="export-format">Format</Label>
            <Select
              value={format}
              onValueChange={(value) => setFormat(value as ExportFormat)}
            >
              <SelectTrigger id="export-format" className="w-full">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="html">HTML</SelectItem>
                <SelectItem value="md">Markdown (.md)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="filename">Filename</Label>
            <div className="flex gap-2">
              <Input
                id="filename"
                placeholder="document"
                value={filename}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFilename(e.target.value)
                }
                className="flex-1"
                autoFocus
              />
              <span className="flex items-center text-sm text-slate-500">
                {extension}
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              `Export ${format.toUpperCase()}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
