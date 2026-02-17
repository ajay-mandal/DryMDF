# Deployment Guide

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Redis instance (Upstash, Railway, or self-hosted)
- (Optional) AWS S3 or Cloudflare R2 for file storage

## Backend Deployment (Railway)

### 1. Create Railway Project

1. Visit [railway.app](https://railway.app)
2. Create a new project
3. Add Redis service from Railway marketplace

### 2. Configure Environment Variables

Add these variables to your Railway service:

```env
NODE_ENV=production
PORT=4000
API_PREFIX=api
CORS_ORIGIN=https://your-frontend-domain.vercel.app
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
PUPPETEER_ARGS=--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage
```

### 3. Add Railway Configuration

Create `railway.json` in `apps/backend/`:

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "cd ../.. && pnpm install && pnpm turbo run build --filter=@drymdf/backend"
  },
  "deploy": {
    "startCommand": "node dist/main.js",
    "healthcheckPath": "/api/health",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 4. Deploy

```bash
railway up
```

## Alternative: Render Deployment

### 1. Create render.yaml

```yaml
services:
  - type: web
    name: drymdf-api
    env: docker
    dockerfilePath: ./docker/Dockerfile.api
    envVars:
      - key: NODE_ENV
        value: production
      - key: REDIS_HOST
        fromService:
          type: redis
          name: drymdf-redis
          property: host
      - key: REDIS_PORT
        fromService:
          type: redis
          name: drymdf-redis
          property: port
      - key: REDIS_PASSWORD
        fromService:
          type: redis
          name: drymdf-redis
          property: password

  - type: redis
    name: drymdf-redis
    maxmemoryPolicy: noeviction
```

## Frontend Deployment (Vercel)

### 1. Install Vercel CLI

```bash
pnpm add -g vercel
```

### 2. Configure Environment Variables

Add to Vercel dashboard:

```env
NEXT_PUBLIC_API_URL=https://your-api-domain.railway.app/api
NEXT_PUBLIC_WS_URL=wss://your-api-domain.railway.app
```

### 3. Deploy

```bash
cd apps/web
vercel
```

## Docker Deployment

### Build Images

```bash
# Backend
docker build -f docker/Dockerfile.api -t drymdf-api .

# Frontend
docker build -f docker/Dockerfile.web -t drymdf-web .
```

### Run with Docker Compose

```bash
docker-compose up -d
```

## Monitoring

### Sentry (Error Tracking)

1. Create project at [sentry.io](https://sentry.io)
2. Add DSN to environment variables:

```env
SENTRY_DSN=your-sentry-dsn
```

### Uptime Monitoring

Set up health check endpoints:

- `/api/health` - General health
- `/api/health/ready` - Readiness check
- `/api/health/live` - Liveness check

## Scaling

### Backend Scaling

- Horizontal: Add more instances (Railway auto-scales)
- Puppeteer: Increase browser pool size
- Redis: Use Redis Cluster for high availability

### Database (Future)

When adding authentication:

- Use PostgreSQL on Railway or Supabase
- Enable connection pooling (PgBouncer)

## Security Checklist

- [ ] HTTPS enabled (automatic on Vercel/Railway)
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] Environment variables secured
- [ ] Secrets rotated regularly
- [ ] Redis password set
- [ ] Puppeteer sandboxing configured
- [ ] Input validation enabled
- [ ] CSP headers configured

## Performance Optimization

### Backend

1. **Browser Pool**: Reuse Puppeteer instances
2. **Caching**: Cache parsed Markdown in Redis
3. **Job Cleanup**: Remove old jobs (24h)

```typescript
// Add to queue config
defaultJobOptions: {
  removeOnComplete: 100,
  removeOnFail: 1000,
}
```

### Frontend

1. **Code Splitting**: Lazy load heavy components
2. **Bundle Size**: Analyze with `@next/bundle-analyzer`
3. **CDN**: Static assets via Vercel Edge Network

## Troubleshooting

### Puppeteer Issues

If Puppeteer fails to launch:

```env
# Railway/Render
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Docker
PUPPETEER_ARGS=--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage
```

### Memory Issues

Increase Node memory:

```json
{
  "scripts": {
    "start:prod": "node --max-old-space-size=512 dist/main"
  }
}
```

### Redis Connection

Check connection string format:

```
redis://username:password@host:port
```

## Backup and Recovery

### Redis Backup

Enable AOF persistence:

```
appendonly yes
appendfsync everysec
```

### Job Recovery

Jobs are persisted in Redis. After restart:

- Failed jobs can be retried
- Completed jobs are cleared after 24h

## CI/CD with GitHub Actions

See `.github/workflows/` for automated:

- Testing
- Building
- Deployment
- Security scanning

## Cost Estimation

**Development:**

- Railway Hobby: $5/month
- Upstash Redis: Free tier
- Vercel: Free tier
- **Total: ~$5/month**

**Production:**

- Railway Pro: $20/month
- Upstash Pro: $10/month
- Vercel Pro: $20/month
- **Total: ~$50/month**
