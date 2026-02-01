import { Processor, Process } from "@nestjs/bull";
import { Job } from "bull";
import { PdfService } from "../pdf/pdf.service";
import { MarkdownService } from "../markdown/markdown.service";
import { WebsocketGateway } from "../websocket/websocket.gateway";

interface ConvertJobData {
  markdown: string;
  options?: any;
  clientId: string;
}

@Processor("pdf-generation")
export class ConvertProcessor {
  constructor(
    private pdfService: PdfService,
    private markdownService: MarkdownService,
    private wsGateway: WebsocketGateway,
  ) {}

  @Process("generate-pdf")
  async handlePdfGeneration(job: Job<ConvertJobData>) {
    const { markdown, options, clientId } = job.data;

    try {
      // Stage 1: Parse Markdown (20%)
      await job.progress(20);
      this.wsGateway.sendProgress(clientId, {
        stage: "parsing",
        progress: 20,
        message: "Parsing Markdown content...",
      });

      const html = await this.markdownService.parse(markdown);

      // Stage 2: Rendering (50%)
      await job.progress(50);
      this.wsGateway.sendProgress(clientId, {
        stage: "rendering",
        progress: 50,
        message: "Rendering HTML and Mermaid diagrams...",
      });

      // Stage 3: Generate PDF (80%)
      await job.progress(80);
      this.wsGateway.sendProgress(clientId, {
        stage: "generating",
        progress: 80,
        message: "Generating PDF document...",
      });

      const pdfBuffer = await this.pdfService.generatePdf(html, options);

      // Stage 4: Complete (100%)
      await job.progress(100);
      this.wsGateway.sendProgress(clientId, {
        stage: "complete",
        progress: 100,
        message: "PDF generated successfully!",
      });

      return {
        buffer: pdfBuffer.toString("base64"),
        filename: `document_${Date.now()}.pdf`,
      };
    } catch (error) {
      this.wsGateway.sendProgress(clientId, {
        stage: "failed",
        progress: 0,
        message: `Error: ${(error as Error).message}`,
      });
      throw error;
    }
  }
}
