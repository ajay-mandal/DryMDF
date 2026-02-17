import { create } from "zustand";
import type { PdfOptions } from "@/types/pdf";

interface ExportStore {
  isExporting: boolean;
  progress: number;
  stage: string;
  pdfOptions: PdfOptions;

  setExporting: (isExporting: boolean) => void;
  setProgress: (progress: number, stage: string) => void;
  updatePdfOptions: (options: Partial<PdfOptions>) => void;
  resetExport: () => void;
}

const defaultPdfOptions: PdfOptions = {
  format: "a4",
  pageColor: "#ffffff",
  autoTextContrast: true,
  margins: {
    top: "20mm",
    right: "20mm",
    bottom: "20mm",
    left: "20mm",
  },
  showHeaderFooter: false,
};

export const useExportStore = create<ExportStore>((set) => ({
  isExporting: false,
  progress: 0,
  stage: "idle",
  pdfOptions: defaultPdfOptions,

  setExporting: (isExporting) => set({ isExporting }),

  setProgress: (progress, stage) => set({ progress, stage }),

  updatePdfOptions: (options) =>
    set((state) => ({
      pdfOptions: { ...state.pdfOptions, ...options },
    })),

  resetExport: () =>
    set({
      isExporting: false,
      progress: 0,
      stage: "idle",
    }),
}));
