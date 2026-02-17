# Contributing to DryMDF

Thank you for your interest in contributing to DryMDF! This document provides guidelines and instructions for contributing.

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Redis (for job queues)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/drymdf.git
cd drymdf
```

2. Install dependencies:

```bash
pnpm install
```

3. Set up environment variables:

```bash
cp apps/backend/.env.example apps/backend/.env
```

4. Start Redis (if not already running):

```bash
# Using Docker
docker run -d -p 6379:6379 redis:alpine

# Or using Homebrew (macOS)
brew services start redis
```

5. Start development servers:

```bash
pnpm dev
```

## Project Structure

```
drymdf/
├── apps/
│   ├── web/          # Next.js Frontend
│   └── api/          # NestJS Backend
├── packages/
│   └── shared/       # Shared types and constants
└── docs/             # Documentation
```

## Development Workflow

### Making Changes

1. Create a new branch:

```bash
git checkout -b feature/your-feature-name
```

2. Make your changes following our coding standards

3. Run tests:

```bash
pnpm test
```

4. Run linting:

```bash
pnpm lint
```

5. Commit your changes:

```bash
git commit -m "feat: add your feature description"
```

### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

### Code Style

- Use TypeScript strict mode
- Follow ESLint and Prettier configurations
- Write meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused

### Testing

- Write unit tests for utilities and services
- Write integration tests for API endpoints
- Write E2E tests for critical user flows

## Pull Request Process

1. Update documentation if needed
2. Ensure all tests pass
3. Update CHANGELOG.md if applicable
4. Submit PR with clear description
5. Address review feedback

## Questions?

Feel free to open an issue for any questions or concerns.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
