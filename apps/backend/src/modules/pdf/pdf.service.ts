import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as puppeteer from "puppeteer";
import type { Browser, PDFOptions } from "puppeteer";
import { getBaseStyles, getDefaultFooter } from "./print-layout";

interface PdfGenerationOptions {
  format?: string;
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

@Injectable()
export class PdfService implements OnModuleInit, OnModuleDestroy {
  private browser: Browser | null = null;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    try {
      const executablePath = this.configService.get<string>(
        "puppeteer.executablePath",
      );
      const args = this.configService.get<string[]>("puppeteer.args");

      this.browser = await puppeteer.launch({
        headless: "new",
        executablePath,
        args: args || [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
        ],
      });

      console.log("✅ Puppeteer browser initialized");
    } catch (error) {
      console.error("❌ Failed to initialize Puppeteer:", error);
      // Don't throw - allow app to start without PDF generation
      // PDF generation will fail gracefully when attempted
    }
  }

  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
      console.log("🔻 Puppeteer browser closed");
    }
  }

  async generatePdf(
    html: string,
    options?: PdfGenerationOptions,
  ): Promise<Buffer> {
    if (!this.browser) {
      throw new Error("Browser not initialized");
    }

    const page = await this.browser.newPage();

    try {
      const resolvedMargins = {
        top: options?.margins?.top || "20mm",
        right: options?.margins?.right || "20mm",
        bottom: options?.margins?.bottom || "20mm",
        left: options?.margins?.left || "20mm",
      };

      // Set content with Mermaid scripts
      await page.setContent(
        this.wrapWithMermaid(html, options, resolvedMargins),
        {
          waitUntil: "networkidle0",
          timeout: 30000,
        },
      );

      // Give Mermaid more time to initialize
      await page.waitForTimeout(1000);

      // Wait for Mermaid diagrams to render
      await page
        .waitForFunction(
          () => {
            const diagrams = document.querySelectorAll(".mermaid");
            if (diagrams.length === 0) return true;
            return Array.from(diagrams).every((d) => d.querySelector("svg"));
          },
          { timeout: 15000 },
        )
        .catch(() => {
          console.warn("Mermaid diagrams timed out, proceeding anyway");
        });

      // Extra wait after Mermaid diagrams are detected
      await page.waitForTimeout(500);

      const displayHeaderFooter = options?.showHeaderFooter ?? false;
      const headerTemplate = displayHeaderFooter
        ? options?.headerTemplate?.trim() || "<div></div>"
        : undefined;

      const pdfOptions: PDFOptions = {
        format: (options?.format || "a4") as PDFOptions["format"],
        margin: {
          top: "0",
          right: "0",
          bottom: "0",
          left: "0",
        },
        printBackground: true,
        displayHeaderFooter,
        headerTemplate,
        footerTemplate:
          options?.footerTemplate ||
          getDefaultFooter(
            options?.pageNumberAlign,
            options?.showTotalPages ?? true,
          ),
      };

      const pdfBuffer = await page.pdf(pdfOptions);

      return Buffer.from(pdfBuffer);
    } finally {
      await page.close();
    }
  }

  private wrapWithMermaid(
    html: string,
    options?: PdfGenerationOptions,
    margins?: {
      top: string;
      right: string;
      bottom: string;
      left: string;
    },
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">
          <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
          <script>
            mermaid.initialize({ 
              startOnLoad: true, 
              theme: 'default',
              securityLevel: 'loose',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            });
          </script>
          <style>${getBaseStyles(options?.pageColor, options?.autoTextContrast ?? true, margins)}</style>
        </head>
        <body>
          <div class="pdf-page-content">
            ${html}
          </div>
        </body>
      </html>
    `;
  }
}
