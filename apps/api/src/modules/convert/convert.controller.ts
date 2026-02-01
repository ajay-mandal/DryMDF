import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  NotFoundException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { ConvertService } from "./convert.service";
import { ConvertPdfDto } from "./dto/convert-pdf.dto";
import { ConvertHtmlDto } from "./dto/convert-html.dto";

@ApiTags("convert")
@Controller("convert")
export class ConvertController {
  constructor(private readonly convertService: ConvertService) {}

  @Post("pdf")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: "Queue PDF conversion job",
    description:
      "Submits a Markdown document for PDF conversion. Returns job ID for tracking progress via WebSocket.",
  })
  @ApiBody({ type: ConvertPdfDto })
  @ApiResponse({
    status: 201,
    description: "Job queued successfully",
    schema: {
      type: "object",
      properties: {
        jobId: { type: "string", example: "123" },
        status: { type: "string", example: "queued" },
      },
    },
  })
  @ApiResponse({ status: 400, description: "Invalid input" })
  @ApiResponse({ status: 429, description: "Too many requests" })
  async convertToPdf(@Body() dto: ConvertPdfDto) {
    const jobId = await this.convertService.queuePdfConversion(dto);
    return {
      jobId,
      status: "queued",
    };
  }

  @Get("pdf/:jobId")
  @ApiOperation({
    summary: "Get PDF job status",
    description:
      "Retrieves the status of a PDF conversion job. Returns completed result or current progress.",
  })
  @ApiResponse({
    status: 200,
    description: "Job status retrieved",
    schema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["queued", "active", "completed", "failed"],
        },
        progress: { type: "number", example: 50 },
        result: {
          type: "object",
          properties: {
            buffer: { type: "string", description: "Base64 encoded PDF" },
            filename: { type: "string", example: "document.pdf" },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: "Job not found" })
  async getPdfStatus(@Param("jobId") jobId: string) {
    const status = await this.convertService.getJobStatus(jobId);

    if (!status) {
      throw new NotFoundException("Job not found");
    }

    return status;
  }

  @Post("html")
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({
    summary: "Convert Markdown to HTML",
    description:
      "Synchronously converts Markdown to sanitized HTML with Mermaid diagrams.",
  })
  @ApiBody({ type: ConvertHtmlDto })
  @ApiResponse({
    status: 200,
    description: "HTML generated successfully",
    schema: {
      type: "object",
      properties: {
        html: { type: "string", description: "Sanitized HTML output" },
      },
    },
  })
  @ApiResponse({ status: 400, description: "Invalid input" })
  @ApiResponse({ status: 429, description: "Too many requests" })
  async convertToHtml(@Body() dto: ConvertHtmlDto) {
    const html = await this.convertService.convertToHtml(dto.markdown);
    return { html };
  }
}
