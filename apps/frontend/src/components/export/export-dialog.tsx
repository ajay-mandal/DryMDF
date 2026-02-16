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
import { useExportStore } from "@/stores/export-store";
import { FileDown, Loader2 } from "lucide-react";

interface ExportDialogProps {
  onExport: (filename: string) => void;
}

export function ExportDialog({ onExport }: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [filename, setFilename] = useState("document");
  const { isExporting } = useExportStore();

  const handleExport = () => {
    onExport(filename || "document");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={isExporting}>
          {isExporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <FileDown className="mr-2 h-4 w-4" />
              Export PDF
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export to PDF</DialogTitle>
          <DialogDescription>
            Enter a filename for your PDF export.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
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
                .pdf
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              "Export PDF"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
