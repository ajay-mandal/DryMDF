export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface JobStatusResponse {
  status: "queued" | "active" | "completed" | "failed";
  progress: number;
  result?: {
    buffer: string;
    filename: string;
  };
  error?: string;
}
