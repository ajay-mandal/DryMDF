import { Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";
import { MarkdownService } from "../markdown/markdown.service";
import { ConvertPdfDto } from "./dto/convert-pdf.dto";

@Injectable()
export class ConvertService {
  constructor(
    @InjectQueue("pdf-generation") private pdfQueue: Queue,
    private markdownService: MarkdownService,
  ) {}

  async queuePdfConversion(dto: ConvertPdfDto): Promise<string> {
    const job = await this.pdfQueue.add("generate-pdf", {
      markdown: dto.markdown,
      options: dto.options,
      clientId: dto.clientId,
    });

    return String(job.id);
  }

  async getJobStatus(jobId: string) {
    const job = await this.pdfQueue.getJob(jobId);

    if (!job) {
      return null;
    }

    const state = await job.getState();
    const progress = job.progress();

    if (state === "completed") {
      return {
        status: "completed",
        progress: 100,
        result: job.returnvalue,
      };
    }

    if (state === "failed") {
      return {
        status: "failed",
        progress: 0,
        error: job.failedReason,
      };
    }

    return {
      status: state,
      progress,
    };
  }

  async convertToHtml(markdown: string): Promise<string> {
    return this.markdownService.parse(markdown);
  }
}
