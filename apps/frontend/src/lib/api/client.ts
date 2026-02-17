import axios, { AxiosInstance } from "axios";
import { toast } from "sonner";
import type { PdfOptions, JobStatus } from "@/types/pdf";

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api",
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 30000, // 30 seconds
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        return config;
      },
      (error) => {
        return Promise.reject(error);
      },
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          // Server responded with error - log for debugging
          console.error("API Error:", error.response.data);
        } else if (error.request) {
          // Request made but no response - likely network issue
          console.error("Network Error:", error.message);
          toast.error("Network error", {
            description:
              "Unable to connect to the server. Please check your connection.",
            duration: 4000,
          });
        }
        return Promise.reject(error);
      },
    );
  }

  async convertToHtml(markdown: string): Promise<{ html: string }> {
    const response = await this.client.post("/convert/html", { markdown });
    return response.data;
  }

  async convertToPdf(
    markdown: string,
    clientId: string,
    options?: PdfOptions,
  ): Promise<{ jobId: string; status: string }> {
    const response = await this.client.post("/convert/pdf", {
      markdown,
      clientId,
      options,
    });
    return response.data;
  }

  async getPdfStatus(jobId: string): Promise<JobStatus> {
    const response = await this.client.get(`/convert/pdf/${jobId}`);
    return response.data;
  }

  async healthCheck(): Promise<{
    status: string;
    timestamp: string;
    uptime: number;
  }> {
    const response = await this.client.get("/health");
    return response.data;
  }
}

export const apiClient = new ApiClient();
