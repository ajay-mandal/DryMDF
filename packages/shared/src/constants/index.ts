export const API_ENDPOINTS = {
  CONVERT_PDF: "/convert/pdf",
  CONVERT_HTML: "/convert/html",
  JOB_STATUS: (jobId: string) => `/convert/pdf/${jobId}`,
  HEALTH: "/health",
} as const;

export const WEBSOCKET_EVENTS = {
  JOB_PROGRESS: "job-progress",
  CONNECT: "connect",
  DISCONNECT: "disconnect",
} as const;

export const JOB_STAGES = {
  PARSING: "parsing",
  RENDERING: "rendering",
  GENERATING: "generating",
  COMPLETE: "complete",
  FAILED: "failed",
} as const;

export const PDF_FORMATS = {
  A4: "a4",
  LETTER: "letter",
  LEGAL: "legal",
} as const;

export const DEFAULT_MARGINS = {
  top: "20mm",
  right: "20mm",
  bottom: "20mm",
  left: "20mm",
} as const;
