export interface PdfOptions {
  format?: "a3" | "a4" | "legal";
  pageColor?: string;
  autoTextContrast?: boolean;
  pageNumberAlign?: "left" | "center" | "right";
  showTotalPages?: boolean;
  margins?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  showHeaderFooter?: boolean;
  headerTemplate?: string;
  footerTemplate?: string;
}

export interface JobProgress {
  stage: string;
  progress: number;
  message?: string;
}

export interface JobStatus {
  jobId: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress?: number;
  result?: {
    buffer: string;
    filename: string;
  };
}
