# DryMDF Web Application - Project Plan

## Executive Summary

This document outlines the comprehensive development plan for building a production-ready, open-source Markdown to PDF converter web application. The application will enable users to write, edit, preview, and export Markdown documents to PDF and HTML formats.

---

## System Architecture

```mermaid
graph TB
    subgraph "Client Layer - Next.js"
        UI[Next.js Frontend]
        Editor[CodeMirror 6 Editor]
        Preview[Live Preview Panel]
        MermaidClient[Mermaid.js Client Renderer]
        Export[Export Dialog]
        Socket[Socket.io Client]
    end

    subgraph "API Gateway - NestJS"
        Controller[REST Controllers]
        Gateway[WebSocket Gateway]
        Throttle[Rate Limiting]
        Validation[DTO Validation]
    end

    subgraph "Processing Layer - NestJS"
        MarkdownSvc[Markdown Service]
        PDFSvc[PDF Service]
        MermaidSvc[Mermaid Plugin]
        Puppeteer[Puppeteer Browser Pool]
    end

    subgraph "Queue System"
        Bull[Bull Queue]
        Processor[Job Processor]
        Redis[(Redis)]
    end

    subgraph "Storage & Cache"
        S3[(S3 / R2 Storage)]
        Cache[(Redis Cache)]
    end

    UI --> Editor
    UI --> Preview
    Preview --> MermaidClient
    UI --> Export

    Export -->|HTTP| Controller
    Socket <-->|WebSocket| Gateway

    Controller --> Throttle
    Throttle --> Validation
    Validation --> Bull

    Bull --> Redis
    Bull --> Processor

    Processor --> MarkdownSvc
    MarkdownSvc --> MermaidSvc
    Processor --> PDFSvc
    PDFSvc --> Puppeteer

    Processor --> S3
    Processor --> Gateway
    Gateway -->|Progress Updates| Socket

    PDFSvc --> Cache
```

---

## Monorepo Structure

```mermaid
graph TD
    subgraph "Turborepo Monorepo"
        Root[Root package.json]

        subgraph "apps/"
            Web[apps/web - Next.js]
            API[apps/backend - NestJS]
        end

        subgraph "packages/"
            Shared[packages/shared - Types & Constants]
        end

        Root --> Web
        Root --> API
        Root --> Shared

        Web --> Shared
        API --> Shared
    end

    subgraph "Infrastructure"
        Vercel[Vercel - Frontend]
        Railway[Railway - Backend]
        Upstash[Upstash Redis]
        R2[Cloudflare R2]
    end

    Web --> Vercel
    API --> Railway
    API --> Upstash
    API --> R2
```

---

## Data Flow Diagram

```mermaid
flowchart LR
    subgraph Input
        A[User Types MD]
        B[Upload .md File]
    end

    subgraph "Frontend Processing"
        C[Markdown Parser]
        D[Remark Plugins]
        E[Rehype Plugins]
        F[HTML Sanitizer]
        M1[Mermaid.js Client]
    end

    subgraph "Live Preview"
        G[HTML Preview]
        M2[Rendered Diagrams]
    end

    subgraph "Backend Processing - NestJS"
        API[REST API]
        Queue[Bull Queue]
        Parser2[Markdown Service]
        M3[Mermaid Plugin]
        PDF[Puppeteer PDF]
        HTML[HTML Generator]
    end

    subgraph Output
        H[PDF Document]
        I[HTML File]
        WS[WebSocket Progress]
    end

    A --> C
    B --> C
    C --> D
    D --> E
    E --> F
    F --> G
    F --> M1
    M1 --> M2

    F -->|Export Request| API
    API --> Queue
    Queue --> Parser2
    Parser2 --> M3
    M3 --> PDF
    M3 --> HTML
    PDF --> H
    HTML --> I
    Queue --> WS
```

---

## Real-time Job Processing Flow

```mermaid
sequenceDiagram
    participant Client as Next.js Client
    participant WS as WebSocket
    participant API as NestJS API
    participant Queue as Bull Queue
    participant Worker as Job Processor
    participant Puppeteer as Puppeteer
    participant Storage as S3/R2

    Client->>API: POST /convert/pdf
    API->>API: Validate DTO
    API->>API: Check Rate Limit
    API->>Queue: Add Job
    Queue-->>API: Job ID
    API-->>Client: { jobId, status: 'queued' }

    Client->>WS: Subscribe to job updates

    Queue->>Worker: Process Job
    Worker->>Worker: Parse Markdown (20%)
    Worker->>WS: Progress Update
    WS-->>Client: { stage: 'parsing', progress: 20 }

    Worker->>Puppeteer: Render HTML + Mermaid
    Worker->>WS: Progress Update
    WS-->>Client: { stage: 'rendering', progress: 50 }

    Puppeteer->>Puppeteer: Generate PDF
    Worker->>WS: Progress Update
    WS-->>Client: { stage: 'generating', progress: 80 }

    Worker->>Storage: Upload PDF
    Storage-->>Worker: File URL
    Worker->>WS: Complete
    WS-->>Client: { stage: 'complete', url: '...' }

    Client->>Storage: Download PDF
```

---

## Component Architecture

```mermaid
graph TD
    subgraph "App Shell"
        Layout[RootLayout]
        Header[Header Component]
        Theme[Theme Provider]
    end

    subgraph "Editor Module"
        EditorPage[Editor Page]
        MarkdownEditor[CodeMirror 6 Editor]
        Toolbar[Editor Toolbar]
        FileUpload[File Upload Zone]
        Settings[Editor Settings]
    end

    subgraph "Preview Module"
        PreviewPane[Preview Pane]
        HTMLPreview[HTML Preview]
        MermaidRenderer[Mermaid Renderer]
        Toggle[Preview Toggle]
    end

    subgraph "Export Module"
        ExportDialog[Export Dialog]
        PDFOptions[PDF Options Form]
        HTMLOptions[HTML Options Form]
        Progress[Job Progress Tracker]
        DownloadBtn[Download Button]
    end

    subgraph "Real-time"
        SocketProvider[Socket.io Provider]
        JobHook[useJobProgress Hook]
    end

    subgraph "Shared"
        SplitPane[Split Pane Container]
        LoadingState[Loading States]
        ErrorBoundary[Error Boundary]
    end

    Layout --> Header
    Layout --> Theme
    Layout --> SocketProvider
    Layout --> EditorPage

    EditorPage --> SplitPane
    SplitPane --> MarkdownEditor
    SplitPane --> PreviewPane

    MarkdownEditor --> Toolbar
    MarkdownEditor --> FileUpload
    MarkdownEditor --> Settings

    PreviewPane --> HTMLPreview
    HTMLPreview --> MermaidRenderer
    PreviewPane --> Toggle

    EditorPage --> ExportDialog
    ExportDialog --> PDFOptions
    ExportDialog --> HTMLOptions
    ExportDialog --> Progress
    ExportDialog --> DownloadBtn

    Progress --> JobHook
    JobHook --> SocketProvider
```

---

## NestJS Backend Architecture

```mermaid
graph TD
    subgraph "NestJS Application"
        Main[main.ts]
        AppModule[AppModule]
    end

    subgraph "Common"
        Filters[Exception Filters]
        Guards[Throttle Guards]
        Pipes[Validation Pipes]
        Interceptors[Logging Interceptors]
    end

    subgraph "Feature Modules"
        ConvertModule[Convert Module]
        PDFModule[PDF Module]
        MarkdownModule[Markdown Module]
        StorageModule[Storage Module]
        QueueModule[Queue Module]
        WebSocketModule[WebSocket Module]
    end

    subgraph "Convert Module"
        ConvertController[Controller]
        ConvertService[Service]
        ConvertProcessor[Bull Processor]
        ConvertDTO[DTOs]
    end

    subgraph "PDF Module"
        PDFService[PDF Service]
        Templates[PDF Templates]
        Fonts[Custom Fonts]
    end

    subgraph "Markdown Module"
        MarkdownService[Markdown Service]
        MermaidPlugin[Mermaid Plugin]
        HighlightPlugin[Highlight Plugin]
    end

    subgraph "WebSocket Module"
        WSGateway[WebSocket Gateway]
        JobEvents[Job Progress Events]
    end

    Main --> AppModule
    AppModule --> Filters
    AppModule --> Guards
    AppModule --> Pipes
    AppModule --> Interceptors

    AppModule --> ConvertModule
    AppModule --> PDFModule
    AppModule --> MarkdownModule
    AppModule --> StorageModule
    AppModule --> QueueModule
    AppModule --> WebSocketModule

    ConvertModule --> ConvertController
    ConvertModule --> ConvertService
    ConvertModule --> ConvertProcessor

    ConvertProcessor --> PDFService
    ConvertProcessor --> MarkdownService
    ConvertProcessor --> WSGateway

    MarkdownService --> MermaidPlugin
    MarkdownService --> HighlightPlugin
```

---

## State Management Flow

```mermaid
stateDiagram-v2
    [*] --> Idle

    Idle --> Editing: User starts typing
    Editing --> Parsing: Content changed (debounced)
    Parsing --> PreviewReady: Parse complete
    Parsing --> RenderingMermaid: Mermaid blocks detected
    RenderingMermaid --> PreviewReady: Diagrams rendered
    PreviewReady --> Editing: User continues typing

    Editing --> Uploading: File dropped
    Uploading --> Editing: File content loaded
    Uploading --> Error: Upload failed

    PreviewReady --> Exporting: Export triggered
    Exporting --> Queued: Job submitted to backend
    Queued --> Processing: Job started
    Processing --> Generating: PDF/HTML generation
    Generating --> Downloading: Generation complete
    Downloading --> PreviewReady: Download started

    Queued --> Error: Queue failed
    Processing --> Error: Processing failed
    Generating --> Error: Generation failed

    Error --> Idle: Error dismissed
    Error --> Editing: Retry action
```

---

## Development Phases

```mermaid
gantt
    title DryMDF Development Timeline
    dateFormat  YYYY-MM-DD

    section Phase 1: Foundation
    Monorepo Setup (Turborepo)       :p1a, 2026-02-02, 2d
    Next.js Frontend Setup           :p1b, after p1a, 2d
    NestJS Backend Setup             :p1c, after p1a, 2d
    Core UI Layout                   :p1d, after p1b, 3d
    Markdown Editor Integration      :p1e, after p1d, 4d
    Basic Preview + Mermaid          :p1f, after p1e, 3d

    section Phase 2: Core Features
    Live Preview Sync                :p2a, after p1f, 3d
    File Upload System               :p2b, after p2a, 2d
    NestJS PDF Module                :p2c, after p1c, 5d
    Bull Queue Integration           :p2d, after p2c, 3d
    WebSocket Progress               :p2e, after p2d, 2d
    HTML Export                      :p2f, after p2e, 2d

    section Phase 3: Enhancement
    PDF Customization Options        :p3a, after p2f, 4d
    Editor Toolbar & Shortcuts       :p3b, after p3a, 3d
    Theme Support (Dark/Light)       :p3c, after p3b, 2d
    Mermaid Theme Integration        :p3d, after p3c, 1d
    Responsive Design                :p3e, after p3d, 3d

    section Phase 4: Polish
    Performance Optimization         :p4a, after p3e, 4d
    Error Handling & Edge Cases      :p4b, after p4a, 3d
    Accessibility Audit              :p4c, after p4b, 2d
    Testing Suite (Both Apps)        :p4d, after p4c, 5d

    section Phase 5: Launch
    Documentation                    :p5a, after p4d, 3d
    Docker & CI/CD                   :p5b, after p5a, 2d
    Security Audit                   :p5c, after p5b, 2d
    Deployment Setup                 :p5d, after p5c, 2d
    Launch & Monitoring              :p5e, after p5d, 1d
```

---

## Phase 1: Foundation (16 days)

### 1.1 Monorepo Setup (2 days)

**Tasks:**

- [ ] Initialize Turborepo monorepo structure
- [ ] Configure pnpm workspaces
- [ ] Set up shared TypeScript config
- [ ] Configure ESLint and Prettier for monorepo
- [ ] Set up Husky for commit hooks
- [ ] Create shared packages structure

**Commands:**

```bash
npx create-turbo@latest drymdf
cd drymdf
pnpm install
```

**Deliverables:**

- Working Turborepo monorepo
- Shared configuration
- pnpm workspace setup

### 1.2 Next.js Frontend Setup (2 days)

**Tasks:**

- [ ] Initialize Next.js 14 in apps/web
- [ ] Configure Tailwind CSS and shadcn/ui
- [ ] Set up path aliases
- [ ] Configure environment variables
- [ ] Create base layout structure

**Commands:**

```bash
cd apps/web
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir
npx shadcn@latest init
pnpm add zustand zod @tanstack/react-query mermaid socket.io-client
```

### 1.3 NestJS Backend Setup (2 days)

**Tasks:**

- [ ] Initialize NestJS in apps/backend
- [ ] Configure TypeScript strict mode
- [ ] Set up configuration module
- [ ] Configure Swagger/OpenAPI
- [ ] Set up health check endpoint
- [ ] Configure CORS for frontend

**Commands:**

```bash
cd apps/backend
nest new . --package-manager pnpm
pnpm add @nestjs/config @nestjs/swagger @nestjs/throttler
pnpm add @nestjs/bull bull ioredis
pnpm add puppeteer class-validator class-transformer
pnpm add @nestjs/platform-socket.io socket.io
```

**Deliverables:**

- Working NestJS application
- Swagger documentation at /api
- Health check endpoint

### 1.4 Core UI Layout (3 days)

**Tasks:**

- [ ] Create responsive app shell (Header, Main, Footer)
- [ ] Implement split-pane layout component
- [ ] Build resizable panel system
- [ ] Create theme provider (dark/light mode)
- [ ] Add Socket.io provider for real-time
- [ ] Add loading skeletons

### 1.5 Markdown Editor Integration (4 days)

**Tasks:**

- [ ] Integrate CodeMirror 6 editor
- [ ] Configure Markdown syntax highlighting
- [ ] Add line numbers and word count
- [ ] Implement auto-indentation
- [ ] Create editor state management (Zustand)
- [ ] Add localStorage auto-save

**Dependencies:**

```bash
pnpm add @codemirror/view @codemirror/state @codemirror/lang-markdown
pnpm add @codemirror/theme-one-dark @codemirror/commands
```

### 1.6 Basic Preview + Mermaid (3 days)

**Tasks:**

- [ ] Set up unified Markdown processing pipeline
- [ ] Integrate remark-gfm for GitHub Flavored Markdown
- [ ] Add syntax highlighting for code blocks
- [ ] Implement Mermaid client-side rendering
- [ ] Create MermaidRenderer component
- [ ] Handle Mermaid error states gracefully

**Dependencies:**

```bash
pnpm add unified remark-parse remark-gfm remark-rehype
pnpm add rehype-stringify rehype-sanitize rehype-highlight
pnpm add mermaid @tailwindcss/typography
```

**Mermaid Implementation:**

```typescript
// Detect mermaid code blocks and render client-side
const MermaidRenderer = ({ code }) => {
  useEffect(() => {
    mermaid.initialize({ startOnLoad: false, theme: "default" });
    mermaid.render("mermaid-" + id, code).then(({ svg }) => {
      container.innerHTML = svg;
    });
  }, [code]);
};
```

**Deliverables:**

- Real-time HTML preview
- Mermaid diagram rendering
- GFM support

---

## Phase 2: Core Features (17 days)

### 2.1 Live Preview Sync (3 days)

**Tasks:**

- [ ] Implement debounced preview updates (300ms)
- [ ] Add scroll synchronization between editor and preview
- [ ] Create preview loading states
- [ ] Handle large document performance
- [ ] Add preview refresh button

### 2.2 File Upload System (2 days)

**Tasks:**

- [ ] Create drag-and-drop upload zone
- [ ] Implement file type validation
- [ ] Add file size limits (5MB)
- [ ] Handle file reading and content loading
- [ ] Add upload progress indicator

### 2.3 NestJS PDF Module (5 days)

**Tasks:**

- [ ] Create PDF module structure
- [ ] Implement Puppeteer browser pool
- [ ] Create PDF service with Mermaid support
- [ ] Design PDF templates (base, minimal, professional)
- [ ] Add custom font support
- [ ] Implement page size and margin options
- [ ] Create header/footer templates

**NestJS Module Structure:**

```typescript
// apps/backend/src/modules/pdf/pdf.module.ts
@Module({
  providers: [PdfService],
  exports: [PdfService],
})
export class PdfModule {}
```

### 2.4 Bull Queue Integration (3 days)

**Tasks:**

- [ ] Set up Bull queue module
- [ ] Create convert processor
- [ ] Implement job progress tracking
- [ ] Add job status endpoint
- [ ] Configure Redis connection
- [ ] Add job cleanup for completed jobs

**Queue Configuration:**

```typescript
// apps/backend/src/modules/queue/queue.module.ts
@Module({
  imports: [
    BullModule.forRoot({
      redis: { host: "localhost", port: 6379 },
    }),
    BullModule.registerQueue({ name: "pdf-generation" }),
  ],
})
export class QueueModule {}
```

### 2.5 WebSocket Progress (2 days)

**Tasks:**

- [ ] Create WebSocket gateway
- [ ] Implement job progress events
- [ ] Create client-side socket hook
- [ ] Add progress UI component
- [ ] Handle reconnection logic

**WebSocket Gateway:**

```typescript
// apps/backend/src/modules/websocket/websocket.gateway.ts
@WebSocketGateway({ cors: true })
export class WebsocketGateway {
  @WebSocketServer() server: Server;

  sendProgress(clientId: string, data: JobProgress) {
    this.server.to(clientId).emit("job-progress", data);
  }
}
```

### 2.6 HTML Export (2 days)

**Tasks:**

- [ ] Create HTML export endpoint
- [ ] Generate self-contained HTML with embedded CSS
- [ ] Include Mermaid diagrams as SVG
- [ ] Add copy-to-clipboard functionality
- [ ] Implement download as .html file

**Deliverables:**

- Complete PDF generation pipeline
- Real-time progress updates
- HTML export functionality

---

## Phase 3: Enhancement (13 days)

### 3.1 PDF Customization Options (4 days)

**Tasks:**

- [ ] Build PDF options dialog
- [ ] Implement page size selector
- [ ] Add margin controls (top, right, bottom, left)
- [ ] Create font selection
- [ ] Add header/footer toggle and content
- [ ] Implement page numbering options
- [ ] Create PDF templates (minimal, professional, academic)

### 3.2 Editor Toolbar & Shortcuts (3 days)

**Tasks:**

- [ ] Build formatting toolbar (bold, italic, links, etc.)
- [ ] Implement keyboard shortcuts
- [ ] Add heading level selector
- [ ] Create list formatting buttons
- [ ] Add table insertion tool
- [ ] Add Mermaid diagram insertion button
- [ ] Add code block insertion with language selector

**Keyboard Shortcuts:**
| Action | Shortcut |
|--------|----------|
| Bold | Ctrl/Cmd + B |
| Italic | Ctrl/Cmd + I |
| Link | Ctrl/Cmd + K |
| Heading | Ctrl/Cmd + 1-6 |
| Save | Ctrl/Cmd + S |
| Export PDF | Ctrl/Cmd + Shift + P |

### 3.3 Theme Support (2 days)

**Tasks:**

- [ ] Implement dark/light mode toggle
- [ ] Create editor theme variants
- [ ] Add preview theme options
- [ ] Persist theme preference

### 3.4 Mermaid Theme Integration (1 day)

**Tasks:**

- [ ] Sync Mermaid theme with app theme
- [ ] Add Mermaid-specific theme options
- [ ] Implement theme switching for diagrams
- [ ] Test all diagram types in both themes

### 3.5 Responsive Design (3 days)

**Tasks:**

- [ ] Mobile layout (stacked panels)
- [ ] Tablet layout optimization
- [ ] Touch-friendly controls
- [ ] Mobile toolbar adaptation

**Deliverables:**

- Fully responsive application
- Theme-aware Mermaid diagrams
- Mobile-optimized experience

---

## Phase 4: Polish (14 days)

### 4.1 Performance Optimization (4 days)

**Tasks:**

- [ ] Implement virtual scrolling for large documents
- [ ] Add Web Worker for Markdown parsing
- [ ] Optimize bundle size (code splitting)
- [ ] Implement Puppeteer browser pool for NestJS
- [ ] Add PDF caching with Redis
- [ ] Optimize Mermaid rendering (lazy load)

**Performance Targets:**

- FCP < 1.5s
- TTI < 3s
- LCP < 2.5s
- PDF Generation < 5s

### 4.2 Error Handling & Edge Cases (3 days)

**Tasks:**

- [ ] Create error boundary components
- [ ] Handle network failures gracefully
- [ ] Add retry mechanisms for failed jobs
- [ ] Handle WebSocket disconnection
- [ ] Add informative error messages
- [ ] Handle Mermaid syntax errors gracefully

### 4.3 Accessibility Audit (2 days)

**Tasks:**

- [ ] Add ARIA labels to all interactive elements
- [ ] Implement keyboard navigation
- [ ] Ensure focus management
- [ ] Verify color contrast (WCAG 2.1 AA)

### 4.4 Testing Suite (5 days)

**Tasks:**

- [ ] Frontend unit tests (Vitest)
- [ ] Frontend component tests (Testing Library)
- [ ] Backend unit tests (Jest)
- [ ] Backend integration tests
- [ ] E2E tests (Playwright)
- [ ] Set up CI pipeline

**Test Structure:**

```
apps/
├── web/
│   └── tests/
│       ├── unit/
│       ├── integration/
│       └── e2e/
└── api/
    └── test/
        ├── unit/
        ├── integration/
        └── e2e/
```

**Deliverables:**

- 80%+ code coverage
- CI/CD integration
- Automated testing

---

## Phase 5: Launch (10 days)

### 5.1 Documentation (3 days)

**Tasks:**

- [ ] Write comprehensive README
- [ ] Create API documentation (Swagger)
- [ ] Add inline code documentation (JSDoc/TSDoc)
- [ ] Write contributing guidelines
- [ ] Create deployment guide

**Documentation Structure:**

```
docs/
├── README.md
├── API.md               # Auto-generated from Swagger
├── CONTRIBUTING.md
├── DEVELOPMENT.md
├── DEPLOYMENT.md
└── USER_GUIDE.md
```

### 5.2 Docker & CI/CD (2 days)

**Tasks:**

- [ ] Create Dockerfile for frontend
- [ ] Create Dockerfile for backend
- [ ] Set up docker-compose for local development
- [ ] Create GitHub Actions workflows
- [ ] Set up automatic deployments

**Docker Setup:**

```yaml
# docker-compose.yml
services:
  web:
    build: ./apps/web
    ports: ["3000:3000"]
  api:
    build: ./apps/backend
    ports: ["4000:4000"]
  redis:
    image: redis:alpine
    ports: ["6379:6379"]
```

### 5.3 Security Audit (2 days)

**Tasks:**

- [ ] Review input sanitization
- [ ] Verify rate limiting effectiveness
- [ ] Check for XSS vulnerabilities
- [ ] Review Content Security Policy
- [ ] Scan dependencies (npm audit)
- [ ] Configure security headers

### 5.4 Deployment Setup (2 days)

**Tasks:**

- [ ] Deploy frontend to Vercel
- [ ] Deploy backend to Railway/Render
- [ ] Set up Redis on Upstash
- [ ] Configure S3/R2 for storage
- [ ] Set up Sentry for error tracking
- [ ] Configure custom domains

**Environment Variables:**

```env
# Frontend (.env)
NEXT_PUBLIC_API_URL=https://api.drymdf.com
NEXT_PUBLIC_WS_URL=wss://api.drymdf.com

# Backend (.env)
REDIS_URL=redis://...
AWS_S3_BUCKET=drymdf-files
CORS_ORIGIN=https://drymdf.com
```

### 5.5 Launch & Monitoring (1 day)

**Tasks:**

- [ ] Final production testing
- [ ] Deploy to production
- [ ] Monitor initial traffic
- [ ] Set up alerts
- [ ] Announce launch

**Deliverables:**

- Live production application
- Monitoring dashboards
- Launch announcement

---

## API Endpoints

```mermaid
sequenceDiagram
    participant Client as Next.js Client
    participant WS as WebSocket
    participant API as NestJS API
    participant Queue as Bull Queue
    participant Parser as Markdown Service
    participant Mermaid as Mermaid Plugin
    participant PDFGen as Puppeteer
    participant Storage as S3/R2

    Note over Client,Storage: PDF Export Flow with Mermaid

    Client->>API: POST /api/convert/pdf
    API->>API: Validate DTO (class-validator)
    API->>API: Check rate limit (Throttler)
    API->>Queue: Add job to queue
    Queue-->>API: Job ID
    API-->>Client: { jobId, status: 'queued' }

    Client->>WS: Subscribe (job-progress)

    Queue->>Parser: Process job
    Parser->>Parser: Parse Markdown
    Parser->>Mermaid: Detect & mark diagrams
    Mermaid-->>Parser: HTML with Mermaid blocks
    Parser->>WS: Progress: 30%
    WS-->>Client: { stage: 'parsing', progress: 30 }

    Parser->>PDFGen: Generate PDF
    PDFGen->>PDFGen: Render HTML + Mermaid.js
    PDFGen->>PDFGen: Wait for diagrams
    PDFGen->>WS: Progress: 70%
    WS-->>Client: { stage: 'rendering', progress: 70 }

    PDFGen->>Storage: Upload PDF
    Storage-->>PDFGen: File URL
    PDFGen->>WS: Complete
    WS-->>Client: { stage: 'complete', downloadUrl: '...' }

    Client->>Storage: Download PDF
```

### Endpoint Specifications

| Endpoint                  | Method | Description              | Rate Limit |
| ------------------------- | ------ | ------------------------ | ---------- |
| `/api/convert/pdf`        | POST   | Queue PDF conversion job | 10/min     |
| `/api/convert/pdf/:jobId` | GET    | Get job status/result    | 60/min     |
| `/api/convert/html`       | POST   | Convert MD to HTML       | 20/min     |
| `/api/upload`             | POST   | Upload .md file          | 5/min      |
| `/api/health`             | GET    | Health check             | None       |
| `/socket.io`              | WS     | Real-time job progress   | N/A        |

### NestJS DTO Examples

```typescript
// apps/backend/src/modules/convert/dto/convert-pdf.dto.ts
import { IsString, IsOptional, ValidateNested, IsEnum } from "class-validator";
import { Type } from "class-transformer";

class MarginsDto {
  @IsOptional() top?: string;
  @IsOptional() right?: string;
  @IsOptional() bottom?: string;
  @IsOptional() left?: string;
}

class PdfOptionsDto {
  @IsEnum(["a4", "letter", "legal"])
  @IsOptional()
  format?: "a4" | "letter" | "legal";

  @ValidateNested()
  @Type(() => MarginsDto)
  @IsOptional()
  margins?: MarginsDto;

  @IsOptional()
  showHeaderFooter?: boolean;
}

export class ConvertPdfDto {
  @IsString()
  markdown: string;

  @IsString()
  clientId: string;

  @ValidateNested()
  @Type(() => PdfOptionsDto)
  @IsOptional()
  options?: PdfOptionsDto;
}
```

---

## Technology Decisions

### Why Separate NestJS Backend?

- PDF generation is CPU-intensive → offload from Next.js
- Independent scaling of PDF service
- Bull queues for async processing with progress
- WebSocket support for real-time status
- Better separation of concerns
- Easier to add auth, database later
- Strong TypeScript support with decorators
- Built-in validation, guards, interceptors

### Why Monorepo with Turborepo?

- Shared types between frontend and backend
- Single repository for easier maintenance
- Parallel builds and caching
- Consistent tooling across apps
- Easier CI/CD setup

### Why CodeMirror 6 over Monaco?

- Smaller bundle size (~100KB vs ~2MB)
- Better mobile support
- Excellent Markdown mode
- Customizable and extensible
- Lighter weight for this use case

### Why Puppeteer for PDF?

- Highest fidelity output
- Full CSS support
- Mermaid.js executes natively (real browser)
- JavaScript execution for dynamic content
- Mature and well-maintained

### Why Bull + Redis for Queues?

- Battle-tested job processing
- Progress tracking built-in
- Job retries and backoff
- Dashboard available (Bull Board)
- Persistent jobs survive restarts

### Why Mermaid.js?

- Industry standard for diagrams in Markdown
- Wide variety of diagram types (flowchart, sequence, gantt, etc.)
- Active development and community
- Theme support for dark/light mode
- Works both client-side and in Puppeteer

---

## Risk Mitigation

| Risk                       | Impact              | Mitigation                                 |
| -------------------------- | ------------------- | ------------------------------------------ |
| Puppeteer cold starts      | Slow first PDF      | Browser pool, warm instances               |
| Large document performance | UI lag              | Virtual scrolling, Web Workers             |
| API abuse                  | Resource exhaustion | Rate limiting, job queue                   |
| XSS vulnerabilities        | Security breach     | Strict sanitization, CSP                   |
| Mermaid syntax errors      | Broken preview      | Graceful error handling, fallback display  |
| WebSocket disconnection    | Lost progress       | Reconnection logic, polling fallback       |
| Redis downtime             | Queue failure       | Upstash with replication, fallback to sync |
| High memory usage          | Backend crashes     | Browser pool limits, job cleanup           |

---

## Success Metrics

| Metric              | Target       | Measurement       |
| ------------------- | ------------ | ----------------- |
| Page Load Time      | < 2s         | Lighthouse        |
| PDF Generation Time | < 5s         | Job metrics       |
| Error Rate          | < 0.1%       | Sentry            |
| Uptime              | 99.9%        | Status monitoring |
| Queue Throughput    | 100 jobs/min | Bull Board        |
| User Satisfaction   | > 4.5/5      | Feedback form     |

---

## Future Enhancements (Post-Launch)

1. **User Accounts** - Save documents to cloud
2. **Collaboration** - Real-time multi-user editing (Yjs/CRDT)
3. **Templates Library** - Pre-built document templates
4. **Version History** - Document revision tracking
5. **Image Upload** - Direct image embedding with S3
6. **Public API** - API keys for integrations
7. **Custom Mermaid Themes** - User-defined diagram styles
8. **CLI Tool** - Command-line PDF generation
9. **VS Code Extension** - Export from VS Code
10. **Self-hosting** - Docker images for self-hosting

---

## Conclusion

This project plan provides a structured approach to building a production-ready DryMDF application with:

- **Next.js 14** frontend with CodeMirror 6 editor
- **NestJS** backend with Bull queues and WebSocket
- **Mermaid.js** support for diagrams
- **Puppeteer** for high-quality PDF generation

**Total Estimated Timeline: ~70 days (~14 weeks)**

**Key Milestones:**

- **Week 2**: Monorepo + basic frontend/backend
- **Week 4**: Editor + Preview + Mermaid working
- **Week 6**: PDF generation with queues
- **Week 8**: All core features complete
- **Week 10**: Performance and polish
- **Week 12**: Testing complete
- **Week 14**: Production launch
