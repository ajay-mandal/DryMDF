import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as puppeteer from "puppeteer";
import type { Browser, PDFOptions } from "puppeteer";

@Injectable()
export class PdfService implements OnModuleInit, OnModuleDestroy {
  private browser: Browser | null = null;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const executablePath = this.configService.get<string>(
      "puppeteer.executablePath",
    );
    const args = this.configService.get<string[]>("puppeteer.args");

    this.browser = await puppeteer.launch({
      headless: "new",
      executablePath,
      args,
    });

    console.log("✅ Puppeteer browser initialized");
  }

  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
      console.log("🔻 Puppeteer browser closed");
    }
  }

  async generatePdf(html: string, options?: any): Promise<Buffer> {
    if (!this.browser) {
      throw new Error("Browser not initialized");
    }

    const page = await this.browser.newPage();

    try {
      // Set content with Mermaid scripts
      await page.setContent(this.wrapWithMermaid(html), {
        waitUntil: "networkidle0",
      });

      // Wait for Mermaid diagrams to render
      await page
        .waitForFunction(
          () => {
            const diagrams = document.querySelectorAll(".mermaid");
            if (diagrams.length === 0) return true;
            return Array.from(diagrams).every((d) => d.querySelector("svg"));
          },
          { timeout: 10000 },
        )
        .catch(() => {
          console.warn("Mermaid diagrams timed out, proceeding anyway");
        });

      const pdfOptions: PDFOptions = {
        format: (options?.format || "a4") as any,
        margin: options?.margins || {
          top: "20mm",
          right: "20mm",
          bottom: "20mm",
          left: "20mm",
        },
        printBackground: true,
        displayHeaderFooter: options?.showHeaderFooter || false,
        headerTemplate: options?.headerTemplate || undefined,
        footerTemplate: options?.footerTemplate || this.getDefaultFooter(),
      };

      const pdfBuffer = await page.pdf(pdfOptions);

      return Buffer.from(pdfBuffer);
    } finally {
      await page.close();
    }
  }

  private wrapWithMermaid(html: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
          <script>
            mermaid.initialize({ 
              startOnLoad: true, 
              theme: 'default',
              securityLevel: 'loose'
            });
          </script>
          <style>${this.getBaseStyles()}</style>
        </head>
        <body class="prose prose-lg max-w-none">
          ${html}
        </body>
      </html>
    `;
  }

  private getDefaultFooter(): string {
    return `
      <div style="font-size: 10px; text-align: center; width: 100%; margin: 0 20px;">
        <span class="pageNumber"></span> / <span class="totalPages"></span>
      </div>
    `;
  }

  private getBaseStyles(): string {
    return `
      * {
        box-sizing: border-box;
      }
      
      body { 
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        padding: 20px;
        max-width: 100%;
      }
      
      h1, h2, h3, h4, h5, h6 {
        margin-top: 1.5em;
        margin-bottom: 0.5em;
        font-weight: 600;
        line-height: 1.3;
      }
      
      h1 { font-size: 2.5em; border-bottom: 2px solid #eee; padding-bottom: 0.3em; }
      h2 { font-size: 2em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
      h3 { font-size: 1.5em; }
      h4 { font-size: 1.25em; }
      
      p {
        margin: 1em 0;
      }
      
      pre { 
        background: #f6f8fa; 
        padding: 1rem; 
        border-radius: 6px;
        overflow-x: auto;
        border: 1px solid #e1e4e8;
      }
      
      code { 
        font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
        font-size: 0.9em;
        background: #f6f8fa;
        padding: 0.2em 0.4em;
        border-radius: 3px;
      }
      
      pre code {
        background: transparent;
        padding: 0;
      }
      
      blockquote {
        border-left: 4px solid #dfe2e5;
        padding-left: 1em;
        margin-left: 0;
        color: #6a737d;
      }
      
      table {
        border-collapse: collapse;
        width: 100%;
        margin: 1em 0;
      }
      
      table th,
      table td {
        border: 1px solid #dfe2e5;
        padding: 0.5em 1em;
      }
      
      table th {
        background: #f6f8fa;
        font-weight: 600;
      }
      
      ul, ol {
        padding-left: 2em;
        margin: 1em 0;
      }
      
      li {
        margin: 0.25em 0;
      }
      
      a {
        color: #0366d6;
        text-decoration: none;
      }
      
      a:hover {
        text-decoration: underline;
      }
      
      img {
        max-width: 100%;
        height: auto;
      }
      
      hr {
        border: none;
        border-top: 1px solid #e1e4e8;
        margin: 2em 0;
      }
      
      .mermaid { 
        text-align: center; 
        margin: 2em 0;
        page-break-inside: avoid;
      }
      
      .mermaid svg {
        max-width: 100%;
        height: auto;
      }
    `;
  }
}
