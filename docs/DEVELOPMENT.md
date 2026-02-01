# Development Guide

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Redis (local or Docker)

### Installation

Run the automated setup script:

```bash
./setup.sh
```

Or manually:

```bash
# Install dependencies
pnpm install

# Copy environment file
cp apps/api/.env.example apps/api/.env

# Build shared packages
pnpm --filter @md-to-pdf/shared build

# Set up git hooks
pnpm prepare
```

### Start Development Servers

```bash
# Start all services (frontend + backend)
pnpm dev

# Or start individually
pnpm --filter @md-to-pdf/api dev    # Backend only
pnpm --filter @md-to-pdf/web dev    # Frontend only
```

### Start Redis

**Using Docker (Recommended):**

```bash
docker run -d -p 6379:6379 --name redis redis:alpine
```

**Using Homebrew (macOS):**

```bash
brew install redis
brew services start redis
```

**Using apt (Ubuntu/Debian):**

```bash
sudo apt install redis-server
sudo systemctl start redis
```

## Development Workflow

### Project Structure

```
md-to-pdf/
├── apps/
│   ├── api/                    # NestJS Backend
│   │   ├── src/
│   │   │   ├── main.ts         # Entry point
│   │   │   ├── app.module.ts   # Root module
│   │   │   ├── config/         # Configuration
│   │   │   ├── modules/        # Feature modules
│   │   │   └── shared/         # Shared utilities
│   │   └── test/               # Tests
│   └── web/                    # Next.js Frontend (to be added)
├── packages/
│   └── shared/                 # Shared types
└── docs/                       # Documentation
```

### Backend Development

#### Module Structure

Each feature module follows this pattern:

```
modules/
└── convert/
    ├── convert.module.ts       # Module definition
    ├── convert.controller.ts   # REST endpoints
    ├── convert.service.ts      # Business logic
    ├── convert.processor.ts    # Queue processor
    └── dto/                    # Data transfer objects
        ├── convert-pdf.dto.ts
        └── convert-html.dto.ts
```

#### Creating a New Module

```bash
cd apps/api
nest generate module modules/feature-name
nest generate controller modules/feature-name
nest generate service modules/feature-name
```

#### Adding Endpoints

1. Define DTOs with validation:

```typescript
// dto/create-feature.dto.ts
import { IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateFeatureDto {
  @ApiProperty({ description: "Feature name" })
  @IsString()
  @MinLength(1)
  name: string;
}
```

2. Add controller endpoint:

```typescript
// feature.controller.ts
@Post()
@ApiOperation({ summary: "Create feature" })
@ApiResponse({ status: 201, description: "Created" })
async create(@Body() dto: CreateFeatureDto) {
  return this.service.create(dto);
}
```

3. Implement service logic:

```typescript
// feature.service.ts
async create(dto: CreateFeatureDto) {
  // Implementation
}
```

#### Testing

```bash
# Unit tests
pnpm --filter @md-to-pdf/api test

# E2E tests
pnpm --filter @md-to-pdf/api test:e2e

# Test coverage
pnpm --filter @md-to-pdf/api test:cov

# Watch mode
pnpm --filter @md-to-pdf/api test:watch
```

#### Debugging

VS Code launch configuration:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug API",
  "runtimeExecutable": "pnpm",
  "runtimeArgs": ["--filter", "@md-to-pdf/api", "start:debug"],
  "console": "integratedTerminal",
  "restart": true,
  "protocol": "inspector"
}
```

### Working with Bull Queues

#### Adding a New Job Type

1. Register the queue in module:

```typescript
BullModule.registerQueue({
  name: "my-queue",
});
```

2. Create processor:

```typescript
@Processor("my-queue")
export class MyQueueProcessor {
  @Process("my-job")
  async handleJob(job: Job<MyJobData>) {
    // Process job
    await job.progress(50);
    // Return result
    return { success: true };
  }
}
```

3. Add job to queue:

```typescript
async addJob(data: MyJobData) {
  const job = await this.myQueue.add("my-job", data);
  return job.id;
}
```

### Markdown Processing

The markdown pipeline uses unified ecosystem:

```typescript
unified()
  .use(remarkParse) // Parse markdown
  .use(remarkGfm) // GitHub Flavored Markdown
  .use(remarkMath) // Math equations
  .use(remarkRehype) // Convert to HTML
  .use(rehypeKatex) // Render math
  .use(rehypeHighlight) // Syntax highlighting
  .use(rehypeSanitize) // Sanitize HTML
  .use(rehypeStringify) // Convert to string
  .process(markdown);
```

#### Adding Custom Plugins

```typescript
// plugins/custom-plugin.ts
import { visit } from "unist-util-visit";

export function customPlugin() {
  return (tree) => {
    visit(tree, "element", (node) => {
      // Modify AST nodes
    });
  };
}

// Use in pipeline
.use(customPlugin)
```

### PDF Generation

#### Puppeteer Best Practices

1. **Reuse Browser Instance**: Browser is initialized once in `onModuleInit`
2. **Close Pages**: Always close pages in `finally` block
3. **Wait for Content**: Use `waitUntil: 'networkidle0'` for dynamic content
4. **Handle Timeouts**: Set reasonable timeouts for Mermaid rendering

#### Custom PDF Templates

```typescript
// templates/my-template.ts
export function getMyTemplate(html: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>${getCustomStyles()}</style>
      </head>
      <body>${html}</body>
    </html>
  `;
}
```

### WebSocket Events

#### Emitting Events

```typescript
this.wsGateway.sendProgress(clientId, {
  stage: "processing",
  progress: 50,
  message: "Processing...",
});
```

#### Testing WebSocket

```typescript
import { io } from "socket.io-client";

const socket = io("http://localhost:4000");

socket.on("job-progress", (data) => {
  console.log(data);
});
```

## Common Tasks

### Update Dependencies

```bash
# Check for updates
pnpm outdated

# Update all packages
pnpm update --latest

# Update specific package
pnpm update puppeteer --latest
```

### Database Migrations (Future)

When adding Prisma:

```bash
# Create migration
pnpm prisma migrate dev --name migration_name

# Apply migrations
pnpm prisma migrate deploy

# Generate client
pnpm prisma generate
```

### Linting and Formatting

```bash
# Lint all files
pnpm lint

# Fix linting issues
pnpm lint --fix

# Format all files
pnpm format

# Check formatting
pnpm format:check
```

### Build for Production

```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter @md-to-pdf/api build

# Type check
pnpm type-check
```

## Troubleshooting

### Redis Connection Issues

**Error**: `ECONNREFUSED 127.0.0.1:6379`

**Solution**:

```bash
# Check if Redis is running
redis-cli ping

# Start Redis
redis-server

# Or with Docker
docker start redis
```

### Puppeteer Issues

**Error**: `Failed to launch browser`

**Solutions**:

```bash
# Install Chromium dependencies (Linux)
sudo apt-get install -y chromium-browser

# Use system Chromium
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Skip Chromium download
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
```

### Port Already in Use

**Error**: `Port 4000 is already in use`

**Solutions**:

```bash
# Find process using port
lsof -ti:4000

# Kill process
kill -9 $(lsof -ti:4000)

# Or change port in .env
PORT=4001
```

### Module Not Found

**Error**: `Cannot find module '@md-to-pdf/shared'`

**Solution**:

```bash
# Build shared package
pnpm --filter @md-to-pdf/shared build

# Reinstall dependencies
rm -rf node_modules
pnpm install
```

## Performance Tips

### Backend Optimization

1. **Cache Parsed Markdown**: Use Redis cache for frequently converted content
2. **Browser Pool**: Limit concurrent Puppeteer instances
3. **Job Cleanup**: Remove old jobs regularly
4. **Connection Pooling**: Reuse database connections

### Development Speed

1. **Hot Reload**: Use `--watch` mode for instant updates
2. **Selective Builds**: Use `--filter` to build specific packages
3. **Skip Tests**: Use `--ignore-scripts` when installing dependencies

## Useful Commands

```bash
# View package scripts
pnpm run

# View available filters
pnpm -r list

# Clear Turbo cache
pnpm turbo clean

# View Bull queue dashboard
pnpm dlx bull-board

# Generate API client types
pnpm --filter @md-to-pdf/api swagger:generate

# Database studio (future)
pnpm prisma studio
```

## Resources

- [NestJS Documentation](https://docs.nestjs.com)
- [Puppeteer Documentation](https://pptr.dev)
- [Bull Documentation](https://github.com/OptimalBits/bull)
- [Unified Documentation](https://unifiedjs.com)
- [Turborepo Documentation](https://turbo.build/repo)

## Getting Help

- Check existing issues on GitHub
- Read API documentation at `/api/docs`
- Review test files for examples
- Ask in project discussions
