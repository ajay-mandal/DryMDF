# MD-to-PDF

Production-ready, open-source web application for converting Markdown to PDF with live preview and Mermaid diagram support.

## Features

- 📝 Feature-rich Markdown editor (CodeMirror 6)
- 👁️ Live HTML/PDF preview with scroll sync
- 📊 Mermaid diagram support (flowcharts, sequence diagrams, etc.)
- 🎨 Customizable PDF output (page size, margins, fonts)
- 📤 Export to PDF and HTML
- 🌓 Dark/Light theme support
- 📱 Responsive design
- ⚡ Real-time job progress via WebSocket
- 🚀 High-performance async processing

## Tech Stack

### Frontend

- Next.js 14+ (App Router)
- TypeScript (strict mode)
- Tailwind CSS + shadcn/ui
- CodeMirror 6
- Zustand for state management
- Socket.io for real-time updates

### Backend

- NestJS 10+
- Puppeteer for PDF generation
- Bull + Redis for job queues
- WebSocket for progress updates
- Swagger/OpenAPI documentation

## Project Structure

```
md-to-pdf/
├── apps/
│   ├── web/          # Next.js Frontend
│   └── api/          # NestJS Backend
├── packages/
│   └── shared/       # Shared types and constants
├── docs/             # Documentation
└── docker/           # Docker configs
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Redis (for job queues)

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp apps/frontend/.env.example apps/frontend/.env.local
cp apps/backend/.env.example apps/backend/.env

# Start development servers
pnpm dev
```

This will start:

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- API Documentation: http://localhost:4000/api

## Development

```bash
# Run all apps in development mode
pnpm dev

# Build all apps
pnpm build

# Run linting
pnpm lint

# Run type checking
pnpm type-check

# Run tests
pnpm test

# Format code
pnpm format
```

## Documentation

- [Project Plan](./docs/PROJECT_PLAN.md)
- [API Documentation](./docs/API.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)

## License

MIT © Ajay Mandal

## Contributing

Contributions are welcome! Please read our [Contributing Guidelines](./CONTRIBUTING.md) first.
