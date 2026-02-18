# DryMDF Web Application - Copilot Instructions

## Project Overview

Build a production-ready, open-source web application that allows users to:

- Write Markdown content in a feature-rich editor
- Upload existing `.md` files
- View live PDF preview alongside the editor
- Export documents to PDF or HTML formats
- Save and manage documents

---

## Tech Stack

### Frontend (Next.js App)

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: Zustand for global state
- **Markdown Editor**: CodeMirror 6
- **Markdown Parsing**: `unified` ecosystem (`remark`, `rehype`)
- **Mermaid Diagrams**: `mermaid` for client-side rendering
- **PDF Preview**: `react-pdf` or iframe with blob URL
- **Icons**: Lucide React
- **Real-time**: Socket.io client for job progress

### Backend (NestJS Service)

- **Framework**: NestJS 10+
- **Language**: TypeScript (strict mode)
- **PDF Generation**: Puppeteer (headless Chrome)
- **Queue System**: Bull + Redis for async job processing
- **Mermaid Rendering**: Puppeteer (server-side for PDF)
- **Validation**: class-validator + class-transformer
- **API Documentation**: Swagger/OpenAPI
- **WebSocket**: Socket.io for real-time progress updates
- **Rate Limiting**: @nestjs/throttler
- **Caching**: Redis via @nestjs/cache-manager

### Infrastructure

- **Frontend Deployment**: Vercel
- **Backend Deployment**: Railway / Render / AWS ECS
- **Queue & Cache**: Redis (Upstash or Railway)
- **Storage**: AWS S3 / Cloudflare R2 for generated files
- **Monitoring**: Sentry for error tracking
- **Logging**: Pino / Winston

---

## Project Structure

```
drymdf/
├── apps/
│   ├── frontend/                        # Next.js Frontend
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (editor)/
│   │   │   │   │   ├── page.tsx         # Main editor page
│   │   │   │   │   └── layout.tsx
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx             # Landing page
│   │   │   │   └── globals.css
│   │   │   ├── components/
│   │   │   │   ├── editor/
│   │   │   │   │   ├── markdown-editor.tsx
│   │   │   │   │   ├── editor-toolbar.tsx
│   │   │   │   │   ├── file-upload.tsx
│   │   │   │   │   └── editor-settings.tsx
│   │   │   │   ├── preview/
│   │   │   │   │   ├── pdf-preview.tsx
│   │   │   │   │   ├── html-preview.tsx
│   │   │   │   │   ├── mermaid-renderer.tsx  # Client-side Mermaid
│   │   │   │   │   └── preview-toggle.tsx
│   │   │   │   ├── export/
│   │   │   │   │   ├── export-dialog.tsx
│   │   │   │   │   ├── pdf-options.tsx
│   │   │   │   │   ├── export-progress.tsx   # Real-time progress
│   │   │   │   │   └── download-button.tsx
│   │   │   │   ├── layout/
│   │   │   │   │   ├── header.tsx
│   │   │   │   │   ├── split-pane.tsx
│   │   │   │   │   └── footer.tsx
│   │   │   │   └── ui/                  # shadcn/ui components
│   │   │   ├── lib/
│   │   │   │   ├── markdown/
│   │   │   │   │   ├── parser.ts
│   │   │   │   │   ├── plugins.ts
│   │   │   │   │   ├── mermaid.ts       # Mermaid integration
│   │   │   │   │   └── sanitize.ts
│   │   │   │   ├── api/
│   │   │   │   │   ├── client.ts        # API client for backend
│   │   │   │   │   └── socket.ts        # Socket.io client
│   │   │   │   ├── utils/
│   │   │   │   │   ├── file.ts
│   │   │   │   │   ├── debounce.ts
│   │   │   │   │   └── cn.ts
│   │   │   │   └── constants.ts
│   │   │   ├── hooks/
│   │   │   │   ├── use-editor.ts
│   │   │   │   ├── use-preview.ts
│   │   │   │   ├── use-export.ts
│   │   │   │   ├── use-job-progress.ts  # WebSocket job tracking
│   │   │   │   ├── use-file-upload.ts
│   │   │   │   └── use-debounce.ts
│   │   │   ├── stores/
│   │   │   │   ├── editor-store.ts
│   │   │   │   └── settings-store.ts
│   │   │   ├── types/
│   │   │   │   ├── editor.ts
│   │   │   │   ├── pdf.ts
│   │   │   │   └── api.ts
│   │   │   └── config/
│   │   │       ├── site.ts
│   │   │       └── editor.ts
│   │   ├── public/
│   │   │   ├── templates/
│   │   │   └── fonts/
│   │   ├── next.config.js
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── backend/                         # NestJS Backend
│       ├── src/
│       │   ├── main.ts                  # Application entry
│       │   ├── app.module.ts            # Root module
│       │   ├── common/
│       │   │   ├── decorators/
│       │   │   ├── filters/
│       │   │   │   └── http-exception.filter.ts
│       │   │   ├── guards/
│       │   │   │   └── throttle.guard.ts
│       │   │   ├── interceptors/
│       │   │   │   └── logging.interceptor.ts
│       │   │   └── pipes/
│       │   │       └── validation.pipe.ts
│       │   ├── config/
│       │   │   ├── configuration.ts
│       │   │   ├── redis.config.ts
│       │   │   └── puppeteer.config.ts
│       │   ├── modules/
│       │   │   ├── convert/
│       │   │   │   ├── convert.module.ts
│       │   │   │   ├── convert.controller.ts
│       │   │   │   ├── convert.service.ts
│       │   │   │   ├── convert.processor.ts  # Bull queue processor
│       │   │   │   └── dto/
│       │   │   │       ├── convert-pdf.dto.ts
│       │   │   │       └── convert-html.dto.ts
│       │   │   ├── pdf/
│       │   │   │   ├── pdf.module.ts
│       │   │   │   ├── pdf.service.ts
│       │   │   │   ├── templates/
│       │   │   │   │   ├── base.template.ts
│       │   │   │   │   ├── minimal.template.ts
│       │   │   │   │   ├── professional.template.ts
│       │   │   │   │   └── academic.template.ts
│       │   │   │   └── fonts/
│       │   │   ├── markdown/
│       │   │   │   ├── markdown.module.ts
│       │   │   │   ├── markdown.service.ts
│       │   │   │   └── plugins/
│       │   │   │       ├── mermaid.plugin.ts
│       │   │   │       └── highlight.plugin.ts
│       │   │   ├── storage/
│       │   │   │   ├── storage.module.ts
│       │   │   │   ├── storage.service.ts
│       │   │   │   └── providers/
│       │   │   │       ├── s3.provider.ts
│       │   │   │       └── local.provider.ts
│       │   │   ├── queue/
│       │   │   │   ├── queue.module.ts
│       │   │   │   └── queue.service.ts
│       │   │   └── websocket/
│       │   │       ├── websocket.module.ts
│       │   │       ├── websocket.gateway.ts
│       │   │       └── events/
│       │   │           └── job-progress.event.ts
│       │   └── shared/
│       │       ├── interfaces/
│       │       │   ├── pdf-options.interface.ts
│       │       │   └── job-status.interface.ts
│       │       └── constants/
│       │           └── queue.constants.ts
│       ├── test/
│       │   ├── unit/
│       │   ├── integration/
│       │   └── e2e/
│       ├── nest-cli.json
│       ├── tsconfig.json
│       └── package.json
│
├── packages/                            # Shared packages (optional)
│   └── shared/
│       ├── types/
│       │   ├── api.ts
│       │   └── pdf.ts
│       └── constants/
│           └── index.ts
│
├── docker/
│   ├── Dockerfile.web
│   ├── Dockerfile.api
│   └── docker-compose.yml
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   └── deploy.yml
│   └── copilot-instructions.md
│
├── docs/
│   ├── PROJECT_PLAN.md
│   ├── API.md
│   └── DEPLOYMENT.md
│
├── turbo.json                           # Turborepo config
├── package.json                         # Root package.json
├── pnpm-workspace.yaml
└── README.md
```

---

## Development Guidelines

### Code Style & Conventions

1. **TypeScript**
   - Enable strict mode in `tsconfig.json`
   - Define explicit types for all function parameters and return values
   - Use Zod for runtime validation of API inputs
   - Prefer interfaces over types for object shapes

2. **React Components**
   - Use functional components with hooks exclusively
   - Follow the single responsibility principle
   - Implement proper error boundaries
   - Use React.memo() for expensive components
   - Prefer composition over prop drilling

3. **File Naming**
   - Components: `kebab-case.tsx` (e.g., `markdown-editor.tsx`)
   - Utilities: `kebab-case.ts` (e.g., `file-utils.ts`)
   - Types: `kebab-case.ts` in `/types` directory
   - Hooks: `use-*.ts` prefix

4. **Imports**
   - Use absolute imports with `@/` alias
   - Group imports: React → External → Internal → Types → Styles

### Senior Frontend Code Standards (Mandatory)

Use these rules for every frontend implementation. Prioritize maintainability, clarity, and production readiness over quick hacks.

1. **Architecture & Ownership**

- Keep components focused on one responsibility.
- Extract reusable logic into hooks/utilities instead of duplicating code.
- Keep page-level orchestration in route components; keep UI logic in feature components.
- Avoid hidden coupling between stores/components.

2. **Type Safety First**

- No `any` unless explicitly documented and unavoidable.
- Model domain data with explicit interfaces and narrow unions.
- Type all props, callbacks, async return values, and state transitions.
- Validate external input boundaries (API responses, URL params, file uploads).

3. **React Quality Bar**

- Prefer derived state over duplicated state.
- Use `useMemo`/`useCallback` only when they provide clear stability/perf benefits.
- Keep effects minimal, deterministic, and cleanup-safe.
- Never put expensive computation directly in render paths.

4. **UI/UX & Accessibility**

- Every interactive element must be keyboard-accessible and have clear focus states.
- Use semantic HTML and ARIA only when native semantics are insufficient.
- Ensure loading, empty, and error states are present for async UI.
- Maintain WCAG-friendly contrast and readable typography in both light/dark themes.

5. **Performance & Scalability**

- Debounce/throttle expensive operations tied to typing/scrolling.
- Avoid unnecessary rerenders through stable props and state locality.
- Lazy-load heavy/rarely used UI where practical.
- Keep bundle impact in mind when adding dependencies.

6. **Styling Discipline**

- Use only design-system tokens/components (Tailwind + shadcn primitives).
- Do not hardcode ad-hoc colors/shadows unless approved by project theme rules.
- Keep style logic predictable; avoid deeply nested conditional class composition.
- Ensure dark mode parity for all new UI states.

7. **Testing & Reliability**

- Add or update tests for non-trivial logic changes.
- Cover happy path + key edge cases (invalid input, network failure, empty data).
- Prefer testing behavior and outcomes over implementation details.

8. **PR-Ready Code Expectations**

- Keep diffs focused and avoid unrelated refactors.
- Name variables/functions to express intent clearly.
- Remove dead code, temporary logs, and commented-out blocks.
- Document non-obvious decisions with concise comments or docs updates.

9. **Library-First Development (Mandatory)**

- Prefer mature, actively maintained libraries before building custom solutions for complex problems.
- Do not build complicated systems from scratch when a trusted library/service already solves it.
- Choose libraries that improve readability, maintainability, and long-term support.
- Favor ecosystem-standard tools and patterns over niche or unproven implementations.

10. **External Service Integration Standards**

- Always follow official documentation and community best practices when integrating external services.
- Use standard SDKs/clients, typed contracts, retries/timeouts, and structured error handling.
- Keep integration concerns isolated behind service modules/adapters instead of spreading calls across UI code.
- Validate and sanitize all external data at boundaries.

11. **Code Separation for Multi-Feature Work**

- When implementing multiple features, separate logic into clear blocks/modules (by feature responsibility).
- Split large functions into smaller focused functions with explicit names and typed inputs/outputs.
- Keep each feature path independently testable and avoid entangling unrelated concerns in one function.
- Use predictable file boundaries (components, hooks, services, utils) to keep code easy to navigate.

12. **UI/UX Quality Baseline (Always-On)**

- Default to a polished, production-grade UX for all visible frontend changes, not only on explicit request.
- Prefer contextual controls over fragmented controls (for example, one cohesive dropdown for related settings).
- Use state-aware labels and actions (for example, show "Enable" when disabled and "Disable" when enabled).
- Provide clear visual state cues using design-system-safe indicators (for example, selected-state color and single active marker only).
- Avoid noisy or duplicate indicators; when a component already has a built-in selected indicator, do not add extra custom markers.
- Keep interactions predictable: disable dependent options when parent features are off.
- Preserve consistency across light/dark themes and mobile/desktop layouts.
- For settings with immediate effect, provide subtle feedback and keep updates intuitive (auto-refresh where expected, manual refresh only when required).
- Never regress UX quality during refactors; if simplifying code, preserve interaction clarity and accessibility.

### Frontend Done Checklist

- [ ] Strict typing preserved (no unbounded `any`)
- [ ] Loading/empty/error states handled
- [ ] Keyboard and screen-reader accessibility considered
- [ ] Light/dark mode visual parity verified
- [ ] Performance implications reviewed
- [ ] Tests/docs updated where needed
- [ ] Mature libraries/services used where appropriate
- [ ] External integrations follow official/community standards
- [ ] Multi-feature logic is separated into clear blocks/modules
- [ ] Related settings are grouped into cohesive controls (no fragmented UX)
- [ ] Labels and actions are state-aware (Enable/Disable style)
- [ ] Exactly one active indicator is visible for selected options (no duplicate dots/markers)
- [ ] Dependent controls are properly enabled/disabled based on parent setting state

### Component Patterns

```typescript
// Example component structure
"use client";

import { useState, useCallback } from "react";
import { useEditor } from "@/hooks/use-editor";
import type { EditorProps } from "@/types/editor";

interface MarkdownEditorProps extends EditorProps {
  initialContent?: string;
  onContentChange?: (content: string) => void;
}

export function MarkdownEditor({
  initialContent = "",
  onContentChange,
  ...props
}: MarkdownEditorProps) {
  // Implementation
}
```

### State Management

1. **Local State**: Use `useState` for component-specific state
2. **Shared State**: Use Zustand stores for cross-component state
3. **Server State**: Use React Query for API data fetching
4. **URL State**: Use `nuqs` for URL-synchronized state

### API Design

1. **Route Handlers**
   - Validate all inputs with Zod schemas
   - Return consistent response shapes
   - Implement proper error handling
   - Add rate limiting for public endpoints

```typescript
// Example API route
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const ConvertSchema = z.object({
  markdown: z.string().min(1).max(500000),
  options: z
    .object({
      format: z.enum(["a4", "letter"]).default("a4"),
      margins: z
        .object({
          top: z.number().default(20),
          right: z.number().default(20),
          bottom: z.number().default(20),
          left: z.number().default(20),
        })
        .optional(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = ConvertSchema.parse(body);

    // Generate PDF
    const pdfBuffer = await generatePdf(validated);

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="document.pdf"',
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

---

## Feature Implementation Details

### 1. Markdown Editor

**Requirements:**

- Syntax highlighting for Markdown
- Line numbers
- Auto-indentation
- Keyboard shortcuts (Ctrl+B for bold, etc.)
- Find and replace
- Word count display
- Auto-save to localStorage

**Implementation:**

```typescript
// Use CodeMirror 6 for the editor
import { EditorView, basicSetup } from "codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
```

### 2. Live Preview

**Requirements:**

- Real-time Markdown → HTML conversion
- Debounced updates (300ms delay)
- Scroll synchronization between editor and preview
- Support for GFM (GitHub Flavored Markdown)
- Syntax highlighting for code blocks
- Math rendering (KaTeX)
- Mermaid diagram support (client-side rendering)

**Markdown Pipeline:**

```typescript
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";

export async function parseMarkdown(content: string): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkRehype)
    .use(rehypeKatex)
    .use(rehypeHighlight)
    .use(rehypeSanitize)
    .use(rehypeStringify)
    .process(content);

  return String(result);
}
```

**Mermaid Client-Side Rendering:**

```typescript
// src/components/preview/mermaid-renderer.tsx
'use client';

import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidRendererProps {
  chart: string;
  id: string;
}

export function MermaidRenderer({ chart, id }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default', // or 'dark', 'forest', 'neutral'
      securityLevel: 'strict',
    });

    const renderChart = async () => {
      if (containerRef.current) {
        try {
          const { svg } = await mermaid.render(`mermaid-${id}`, chart);
          containerRef.current.innerHTML = svg;
        } catch (error) {
          containerRef.current.innerHTML = `<pre class="text-red-500">Invalid Mermaid syntax</pre>`;
        }
      }
    };

    renderChart();
  }, [chart, id]);

  return <div ref={containerRef} className="mermaid-container" />;
}
```

### 3. PDF Generation (NestJS Backend)

**Requirements:**

- High-quality PDF output
- Customizable page size (A4, Letter, Legal)
- Adjustable margins
- Header/footer support
- Table of contents generation
- Page numbers
- Custom fonts support
- Code block styling
- Mermaid diagram rendering (server-side via Puppeteer)
- Async processing with job queue

**NestJS PDF Service:**

```typescript
// apps/backend/src/modules/pdf/pdf.service.ts
import { Injectable } from "@nestjs/common";
import * as puppeteer from "puppeteer";
import { PdfOptionsDto } from "./dto/pdf-options.dto";

@Injectable()
export class PdfService {
  private browser: puppeteer.Browser | null = null;

  async onModuleInit() {
    this.browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }

  async onModuleDestroy() {
    await this.browser?.close();
  }

  async generatePdf(html: string, options: PdfOptionsDto): Promise<Buffer> {
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
            return Array.from(diagrams).every((d) => d.querySelector("svg"));
          },
          { timeout: 10000 },
        )
        .catch(() => {});

      const pdfBuffer = await page.pdf({
        format: options.format || "a4",
        margin: options.margins || {
          top: "20mm",
          right: "20mm",
          bottom: "20mm",
          left: "20mm",
        },
        printBackground: true,
        displayHeaderFooter: options.showHeaderFooter,
        headerTemplate: options.headerTemplate,
        footerTemplate: options.footerTemplate || this.getDefaultFooter(),
      });

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
          <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
          <script>mermaid.initialize({ startOnLoad: true, theme: 'default' });</script>
          <style>${this.getBaseStyles()}</style>
        </head>
        <body class="prose prose-lg max-w-none">${html}</body>
      </html>
    `;
  }

  private getDefaultFooter(): string {
    return `
      <div style="font-size: 10px; text-align: center; width: 100%;">
        <span class="pageNumber"></span> / <span class="totalPages"></span>
      </div>
    `;
  }

  private getBaseStyles(): string {
    return `
      body { font-family: 'Inter', sans-serif; line-height: 1.6; }
      pre { background: #f6f8fa; padding: 1rem; border-radius: 6px; }
      code { font-family: 'Fira Code', monospace; }
      .mermaid { text-align: center; margin: 1rem 0; }
    `;
  }
}
```

**Bull Queue Processor:**

```typescript
// apps/backend/src/modules/convert/convert.processor.ts
import { Processor, Process, OnQueueProgress } from "@nestjs/bull";
import { Job } from "bull";
import { PdfService } from "../pdf/pdf.service";
import { MarkdownService } from "../markdown/markdown.service";
import { WebsocketGateway } from "../websocket/websocket.gateway";

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

    // Update progress: Parsing markdown
    await job.progress(20);
    this.wsGateway.sendProgress(clientId, { stage: "parsing", progress: 20 });

    const html = await this.markdownService.parse(markdown);

    // Update progress: Generating PDF
    await job.progress(50);
    this.wsGateway.sendProgress(clientId, {
      stage: "generating",
      progress: 50,
    });

    const pdfBuffer = await this.pdfService.generatePdf(html, options);

    // Update progress: Complete
    await job.progress(100);
    this.wsGateway.sendProgress(clientId, { stage: "complete", progress: 100 });

    return { buffer: pdfBuffer.toString("base64"), filename: `document.pdf` };
  }
}
```

**Convert Controller:**

```typescript
// apps/backend/src/modules/convert/convert.controller.ts
import { Controller, Post, Body, Res } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";
import { Throttle } from "@nestjs/throttler";
import { ConvertPdfDto } from "./dto/convert-pdf.dto";

@Controller("convert")
export class ConvertController {
  constructor(@InjectQueue("pdf-generation") private pdfQueue: Queue) {}

  @Post("pdf")
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  async convertToPdf(@Body() dto: ConvertPdfDto) {
    const job = await this.pdfQueue.add("generate-pdf", {
      markdown: dto.markdown,
      options: dto.options,
      clientId: dto.clientId,
    });

    return { jobId: job.id, status: "queued" };
  }

  @Get("pdf/:jobId")
  async getPdfStatus(@Param("jobId") jobId: string) {
    const job = await this.pdfQueue.getJob(jobId);

    if (!job) {
      throw new NotFoundException("Job not found");
    }

    const state = await job.getState();
    const progress = job.progress();

    if (state === "completed") {
      return { status: "completed", result: job.returnvalue };
    }

    return { status: state, progress };
  }
}
```

### 4. File Upload

**Requirements:**

- Drag and drop support
- File type validation (.md, .markdown, .txt)
- File size limit (5MB)
- Progress indicator
- Error handling

### 5. Export Options

**Requirements:**

- PDF export with customization dialog
- HTML export (single file with embedded styles)
- Copy HTML to clipboard
- Download with custom filename

---

## UI/UX Guidelines

### Layout

- Split-pane view: Editor (left) | Preview (right)
- Collapsible panels
- Responsive design (stack on mobile)
- Dark/light theme toggle

### Accessibility

- ARIA labels on all interactive elements
- Keyboard navigation support
- Focus management
- Screen reader announcements for async actions
- Color contrast compliance (WCAG 2.1 AA)

### Performance

- Virtual scrolling for large documents
- Lazy load preview components
- Debounce expensive operations
- Web Workers for heavy parsing
- Service Worker for offline support

---

## Testing Strategy

### Unit Tests (Vitest)

- Markdown parsing functions
- Utility functions
- Zustand stores

### Integration Tests (Testing Library)

- Component interactions
- API route handlers
- Form submissions

### E2E Tests (Playwright)

- Full user workflows
- PDF generation and download
- File upload flow

### Test Commands

```bash
npm run test          # Unit tests
npm run test:e2e      # E2E tests
npm run test:coverage # Coverage report
```

---

## Security Considerations

1. **Input Sanitization**
   - Sanitize all Markdown/HTML output with `rehype-sanitize`
   - Validate file uploads (type, size, content)
   - Escape user content in PDF templates

2. **Rate Limiting**
   - Limit PDF generation: 10 requests/minute per IP
   - Limit file uploads: 5 requests/minute per IP

3. **Content Security Policy**
   - Strict CSP headers
   - No inline scripts except nonce-protected

4. **File Handling**
   - Temporary file cleanup (max 1 hour)
   - No persistent user data storage without auth

---

## Environment Variables

```env
# .env.example

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME="DryMDF"

# Rate Limiting (Upstash Redis)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Storage (Vercel Blob)
BLOB_READ_WRITE_TOKEN=

# PDF Service (if using external)
PDF_SERVICE_URL=
PDF_SERVICE_API_KEY=

# Analytics (optional)
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=

# Error Tracking
SENTRY_DSN=
```

---

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Rate limiting enabled
- [ ] Error tracking configured
- [ ] Analytics set up
- [ ] Security headers configured
- [ ] Performance monitoring enabled
- [ ] Backup and recovery plan
- [ ] Documentation complete
- [ ] License file added (MIT recommended)
- [ ] Contributing guidelines added

---

## Performance Targets

- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Largest Contentful Paint**: < 2.5s
- **PDF Generation**: < 5s for average document
- **Live Preview Update**: < 300ms perceived latency

---

## Commit Message Convention

Follow Conventional Commits:

```
feat: add PDF export with custom margins
fix: resolve preview scroll sync issue
docs: update API documentation
style: format editor toolbar components
refactor: extract markdown parser to separate module
test: add e2e tests for file upload
chore: update dependencies
```

---

## When Implementing Features

1. **Always start with types** - Define TypeScript interfaces first
2. **Write tests alongside code** - TDD or write tests immediately after
3. **Handle edge cases** - Empty states, errors, loading states
4. **Consider accessibility** - Every interactive element needs keyboard support
5. **Optimize lazily** - Profile before optimizing
6. **Document complex logic** - JSDoc comments for non-obvious code
