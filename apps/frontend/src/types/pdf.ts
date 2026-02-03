export interface PdfOptions {
  format?: "a4" | "letter" | "legal";
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
