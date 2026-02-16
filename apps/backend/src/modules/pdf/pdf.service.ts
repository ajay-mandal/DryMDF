import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as puppeteer from "puppeteer";
import type { Browser, PDFOptions } from "puppeteer";

interface PdfGenerationOptions {
  format?: string;
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
      // Set content with Mermaid scripts
      await page.setContent(this.wrapWithMermaid(html), {
        waitUntil: "networkidle0",
        timeout: 30000,
      });

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

      const pdfOptions: PDFOptions = {
        format: (options?.format || "a4") as PDFOptions["format"],
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
          <style>${this.getBaseStyles()}</style>
        </head>
        <body>
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
        color: #24292f;
        padding: 20px;
        max-width: 100%;
        background: #ffffff;
      }
      
      h1, h2, h3, h4, h5, h6 {
        margin-top: 24px;
        margin-bottom: 16px;
        font-weight: 600;
        line-height: 1.25;
      }
      
      h1 { font-size: 2em; border-bottom: 1px solid #d0d7de; padding-bottom: 0.3em; }
      h2 { font-size: 1.5em; border-bottom: 1px solid #d0d7de; padding-bottom: 0.3em; }
      h3 { font-size: 1.25em; }
      h4 { font-size: 1em; }
      h5 { font-size: 0.875em; }
      h6 { font-size: 0.85em; color: #57606a; }
      
      p {
        margin-top: 0;
        margin-bottom: 16px;
      }
      
      pre { 
        background: #f6f8fa;
        padding: 16px;
        border-radius: 6px;
        overflow-x: auto;
        border: 1px solid #d0d7de;
        margin-bottom: 16px;
        font-size: 85%;
        line-height: 1.45;
      }
      
      code { 
        font-family: 'SFMono-Regular', 'Consolas', 'Liberation Mono', 'Menlo', 'Courier', monospace;
        font-size: 85%;
        background: rgba(175, 184, 193, 0.2);
        padding: 0.2em 0.4em;
        border-radius: 6px;
      }
      
      pre code {
        background: transparent;
        padding: 0;
        border-radius: 0;
        display: block;
        overflow-x: auto;
      }
      
      /* Highlight.js Syntax Highlighting */
      .hljs {
        display: block;
        overflow-x: auto;
        padding: 0.5em;
        color: #24292f;
        background: #f6f8fa;
      }
      
      .hljs-doctag,
      .hljs-keyword,
      .hljs-meta .hljs-keyword,
      .hljs-template-tag,
      .hljs-template-variable,
      .hljs-type,
      .hljs-variable.language_ {
        color: #d73a49;
      }
      
      .hljs-title,
      .hljs-title.class_,
      .hljs-title.class_.inherited__,
      .hljs-title.function_ {
        color: #6f42c1;
      }
      
      .hljs-attr,
      .hljs-attribute,
      .hljs-literal,
      .hljs-meta,
      .hljs-number,
      .hljs-operator,
      .hljs-selector-attr,
      .hljs-selector-class,
      .hljs-selector-id,
      .hljs-variable {
        color: #005cc5;
      }
      
      .hljs-meta .hljs-string,
      .hljs-regexp,
      .hljs-string {
        color: #032f62;
      }
      
      .hljs-built_in,
      .hljs-symbol {
        color: #e36209;
      }
      
      .hljs-code,
      .hljs-comment,
      .hljs-formula {
        color: #6a737d;
      }
      
      .hljs-name,
      .hljs-quote,
      .hljs-selector-pseudo,
      .hljs-selector-tag {
        color: #22863a;
      }
      
      .hljs-subst {
        color: #24292f;
      }
      
      .hljs-section {
        color: #005cc5;
        font-weight: bold;
      }
      
      .hljs-bullet {
        color: #735c0f;
      }
      
      .hljs-emphasis {
        color: #24292f;
        font-style: italic;
      }
      
      .hljs-strong {
        color: #24292f;
        font-weight: bold;
      }
      
      .hljs-addition {
        color: #22863a;
        background-color: #f0fff4;
      }
      
      .hljs-deletion {
        color: #b31d28;
        background-color: #ffeef0;
      }
      
      blockquote {
        border-left: 4px solid #d0d7de;
        padding-left: 1em;
        margin-left: 0;
        margin-right: 0;
        color: #57606a;
      }
      
      table {
        border-collapse: collapse;
        border-spacing: 0;
        width: 100%;
        margin-top: 0;
        margin-bottom: 16px;
        overflow: auto;
      }
      
      table th,
      table td {
        border: 1px solid #d0d7de;
        padding: 6px 13px;
      }
      
      table th {
        background: #f6f8fa;
        font-weight: 600;
      }
      
      table tr {
        background-color: #ffffff;
        border-top: 1px solid #d0d7de;
      }
      
      table tr:nth-child(2n) {
        background-color: #f6f8fa;
      }
      
      ul, ol {
        padding-left: 2em;
        margin-top: 0;
        margin-bottom: 16px;
      }
      
      li {
        margin: 0.25em 0;
      }
      
      li + li {
        margin-top: 0.25em;
      }
      
      a {
        color: #0969da;
        text-decoration: none;
      }
      
      a:hover {
        text-decoration: underline;
      }
      
      img {
        max-width: 100%;
        height: auto;
        box-sizing: content-box;
        background-color: #ffffff;
      }
      
      hr {
        border: none;
        border-top: 1px solid #d0d7de;
        margin: 24px 0;
        height: 0.25em;
        padding: 0;
        background-color: #d0d7de;
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
      
      /* KaTeX Math */
      .katex-display {
        margin: 1em 0;
        overflow-x: auto;
        overflow-y: hidden;
      }
      
      .katex {
        font-size: 1.1em;
      }
    `;
  }
}
