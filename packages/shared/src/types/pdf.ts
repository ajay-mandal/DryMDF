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

export interface ConvertJobData {
  markdown: string;
  options?: PdfOptions;
  clientId: string;
}

export interface JobProgress {
  stage: "parsing" | "rendering" | "generating" | "complete" | "failed";
  progress: number;
  message?: string;
}

export interface JobResult {
  buffer: string; // Base64 encoded
  filename: string;
}
