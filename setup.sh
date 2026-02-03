#!/bin/bash

# MD-to-PDF Setup Script
# This script will set up the development environment

set -e

echo "🚀 Setting up MD-to-PDF development environment..."

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js >= 18.0.0"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version must be >= 18.0.0 (current: $(node -v))"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check pnpm
if ! command -v pnpm &> /dev/null; then
    echo "📦 Installing pnpm..."
    npm install -g pnpm@8
fi

echo "✅ pnpm version: $(pnpm -v)"

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Set up environment files
echo "⚙️  Setting up environment files..."

if [ ! -f "apps/backend/.env" ]; then
    cp apps/backend/.env.example apps/backend/.env
    echo "✅ Created apps/backend/.env"
else
    echo "ℹ️  apps/api/.env already exists"
fi

# Check Redis
echo "🔍 Checking Redis..."
if command -v redis-cli &> /dev/null; then
    if redis-cli ping &> /dev/null; then
        echo "✅ Redis is running"
    else
        echo "⚠️  Redis is installed but not running"
        echo "   Start Redis with: redis-server"
        echo "   Or using Docker: docker run -d -p 6379:6379 redis:alpine"
    fi
else
    echo "⚠️  Redis is not installed"
    echo "   Install with Homebrew: brew install redis"
    echo "   Or run with Docker: docker run -d -p 6379:6379 redis:alpine"
fi

# Set up git hooks
echo "🪝 Setting up git hooks..."
pnpm prepare || true

# Build shared packages
echo "🔨 Building shared packages..."
pnpm --filter @md-to-pdf/shared build

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Make sure Redis is running"
echo "  2. Update environment variables in apps/api/.env"
echo "  3. Run 'pnpm dev' to start development servers"
echo ""
echo "Development URLs:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:4000"
echo "  API Docs: http://localhost:4000/api/docs"
echo ""
