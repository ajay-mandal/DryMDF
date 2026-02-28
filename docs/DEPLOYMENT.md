# DryMDF Deployment Guide (Free Tier)

Deploy the DryMDF turborepo application with NestJS backend on GCP Cloud Run, Next.js frontend on Vercel, and Redis on Upstash — all using free tiers.

## Architecture Overview

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│                 │     │                      │     │                 │
│   Vercel        │────▶│   GCP Cloud Run      │────▶│   Upstash       │
│   (Frontend)    │     │   (Backend)          │     │   (Redis)       │
│                 │     │                      │     │                 │
└─────────────────┘     └──────────────────────┘     └─────────────────┘
        │                         │
        │                         │
        ▼                         ▼
┌─────────────────┐     ┌──────────────────────┐
│  GitHub Actions │     │  GCP Artifact        │
│  (CI/CD)        │     │  Registry (Docker)   │
└─────────────────┘     └──────────────────────┘
```

## Free Tier Limits

| Service               | Free Tier                  | Notes                  |
| --------------------- | -------------------------- | ---------------------- |
| GCP Cloud Run         | 180,000 vCPU-seconds/month | ~50 hours at 1 vCPU    |
| GCP Artifact Registry | 500MB storage              | Per region             |
| GCP Cloud Storage     | 5GB                        | Standard storage       |
| Upstash Redis         | 10,000 commands/day, 256MB | Free forever           |
| Vercel                | 100GB bandwidth/month      | Hobby plan             |
| GitHub Actions        | 2,000 minutes/month        | Public repos unlimited |

---

## Phase 1: Upstash Redis Setup

### Steps

1. Go to [https://upstash.com](https://upstash.com) and create an account

2. Create a new Redis database:
   - Click "Create Database"
   - Name: `drymdf-redis`
   - Type: **Regional**
   - Region: `us-central1` (match GCP region)
   - Enable **TLS**

3. Copy connection details from the dashboard:
   - `UPSTASH_REDIS_HOST` (e.g., `valued-marlin-12345.upstash.io`)
   - `UPSTASH_REDIS_PORT` (usually `6379`)
   - `UPSTASH_REDIS_PASSWORD` (from "Password" field)

> **Note**: Upstash uses TLS by default. The NestJS Bull queue should work with standard host/port/password config.

---

## Phase 2: GCP Project Setup

### 2.1 Create Project

1. Go to [https://console.cloud.google.com](https://console.cloud.google.com)
2. Create new project:
   - Name: `drymdf`
   - Note your **Project ID** (e.g., `drymdf-123456`)
3. Enable billing (required for Cloud Run, but free tier applies)

### 2.2 Enable APIs

Run in Cloud Shell or local terminal with gcloud CLI:

```bash
gcloud config set project YOUR_PROJECT_ID

gcloud services enable \
  artifactregistry.googleapis.com \
  run.googleapis.com \
  storage.googleapis.com
```

### 2.3 Create Artifact Registry Repository

```bash
gcloud artifacts repositories create drymdf-docker \
  --repository-format=docker \
  --location=us-central1 \
  --description="DryMDF Docker images"
```

### 2.4 Create Service Account for GitHub Actions

```bash
# Create service account
gcloud iam service-accounts create github-deployer \
  --display-name="GitHub Actions Deployer"

# Get your project ID
PROJECT_ID=$(gcloud config get-value project)

# Grant required roles
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-deployer@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-deployer@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-deployer@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Create and download key
gcloud iam service-accounts keys create gcp-key.json \
  --iam-account=github-deployer@${PROJECT_ID}.iam.gserviceaccount.com

# Base64 encode for GitHub Secret
cat gcp-key.json | base64

# IMPORTANT: Delete the key file after copying
rm gcp-key.json
```

### 2.5 (Optional) Create GCP Storage Bucket

Only needed if you want to store generated PDFs:

```bash
gsutil mb -l us-central1 gs://drymdf-files-${PROJECT_ID}
```

---

## Phase 3: Vercel Setup

### Steps

1. Go to [https://vercel.com](https://vercel.com) and sign in with GitHub

2. Import the DryMDF repository:
   - Click "Add New Project"
   - Select the DryMDF repository
   - Configure:
     - **Framework Preset**: Next.js
     - **Root Directory**: `apps/frontend`
     - **Build Command**: `cd ../.. && pnpm install && pnpm turbo run build --filter=@drymdf/frontend`
     - **Output Directory**: `.next`

3. Add environment variables (leave blank for now, update after backend deploy):
   - `NEXT_PUBLIC_API_URL`: (will be Cloud Run URL + `/api`)
   - `NEXT_PUBLIC_WS_URL`: (will be Cloud Run URL with `wss://`)

4. Deploy (initial deploy will fail until backend is ready)

5. Get Vercel credentials:
   - Go to Settings → Tokens → Create Token
   - Note your **VERCEL_TOKEN**
   - Run `vercel link` locally to get `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` from `.vercel/project.json`

---

## Phase 4: GitHub Secrets Configuration

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

### Required Secrets

| Secret Name              | Value                          | Description                         |
| ------------------------ | ------------------------------ | ----------------------------------- |
| `GCP_PROJECT_ID`         | `drymdf`                       | Your GCP project ID                 |
| `GCP_SA_KEY`             | `ewogICJ0eXBlIjog...`          | Base64-encoded service account JSON |
| `GCP_REGION`             | `us-central1`                  | GCP region                          |
| `GCP_AR_REPO`            | `drymdf-docker`                | Artifact Registry repo name         |
| `UPSTASH_REDIS_HOST`     | `valued-marlin-xxx.upstash.io` | From Upstash dashboard              |
| `UPSTASH_REDIS_PORT`     | `6379`                         | From Upstash dashboard              |
| `UPSTASH_REDIS_PASSWORD` | `AX...`                        | From Upstash dashboard              |
| `VERCEL_TOKEN`           | `xxx`                          | From Vercel dashboard               |
| `VERCEL_ORG_ID`          | `team_xxx`                     | From `.vercel/project.json`         |
| `VERCEL_PROJECT_ID`      | `prj_xxx`                      | From `.vercel/project.json`         |
| `PRODUCTION_URL`         | `https://drymdf.vercel.app`    | Your Vercel production URL          |

---

## Phase 5: GitHub Actions Workflows

### 5.1 CI Workflow

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "18"
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Type check
        run: pnpm type-check

      - name: Lint
        run: pnpm lint

      - name: Format check
        run: pnpm format:check

      - name: Build
        run: pnpm build
```

### 5.2 Backend Deployment Workflow

Create `.github/workflows/deploy-backend.yml`:

```yaml
name: Deploy Backend to GCP Cloud Run

on:
  push:
    branches: [main]
    paths:
      - "apps/backend/**"
      - "packages/shared/**"
      - "docker/Dockerfile.api"
      - ".github/workflows/deploy-backend.yml"
  workflow_dispatch:

env:
  GCP_REGION: us-central1
  SERVICE_NAME: drymdf-backend
  IMAGE_NAME: backend

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v2

      - name: Configure Docker for Artifact Registry
        run: |
          gcloud auth configure-docker ${{ env.GCP_REGION }}-docker.pkg.dev --quiet

      - name: Build Docker image
        run: |
          docker build \
            -f docker/Dockerfile.api \
            -t ${{ env.GCP_REGION }}-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/${{ secrets.GCP_AR_REPO }}/${{ env.IMAGE_NAME }}:${{ github.sha }} \
            -t ${{ env.GCP_REGION }}-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/${{ secrets.GCP_AR_REPO }}/${{ env.IMAGE_NAME }}:latest \
            .

      - name: Push to Artifact Registry
        run: |
          docker push ${{ env.GCP_REGION }}-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/${{ secrets.GCP_AR_REPO }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          docker push ${{ env.GCP_REGION }}-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/${{ secrets.GCP_AR_REPO }}/${{ env.IMAGE_NAME }}:latest

      - name: Deploy to Cloud Run
        uses: google-github-actions/deploy-cloudrun@v2
        with:
          service: ${{ env.SERVICE_NAME }}
          region: ${{ env.GCP_REGION }}
          image: ${{ env.GCP_REGION }}-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/${{ secrets.GCP_AR_REPO }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          flags: |
            --allow-unauthenticated
            --memory=1Gi
            --cpu=1
            --min-instances=0
            --max-instances=2
            --concurrency=80
            --timeout=300
            --cpu-boost
          env_vars: |
            NODE_ENV=production
            PORT=4000
            API_PREFIX=api
            CORS_ORIGIN=${{ secrets.PRODUCTION_URL }}
            REDIS_HOST=${{ secrets.UPSTASH_REDIS_HOST }}
            REDIS_PORT=${{ secrets.UPSTASH_REDIS_PORT }}
            REDIS_PASSWORD=${{ secrets.UPSTASH_REDIS_PASSWORD }}
            PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
            PUPPETEER_ARGS=--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage,--disable-gpu
            STORAGE_TYPE=local
            THROTTLE_TTL=60000
            THROTTLE_LIMIT=10

      - name: Get Cloud Run URL
        id: get-url
        run: |
          URL=$(gcloud run services describe ${{ env.SERVICE_NAME }} --region=${{ env.GCP_REGION }} --format='value(status.url)')
          echo "url=$URL" >> $GITHUB_OUTPUT
          echo "### Backend Deployed! :rocket:" >> $GITHUB_STEP_SUMMARY
          echo "URL: $URL" >> $GITHUB_STEP_SUMMARY
```

### 5.3 Frontend Deployment Workflow

Create `.github/workflows/deploy-frontend.yml`:

```yaml
name: Deploy Frontend to Vercel

on:
  push:
    branches: [main]
    paths:
      - "apps/frontend/**"
      - "packages/shared/**"
      - ".github/workflows/deploy-frontend.yml"
  workflow_dispatch:

env:
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "18"
          cache: "pnpm"

      - name: Install Vercel CLI
        run: pnpm add -g vercel@latest

      - name: Pull Vercel Environment
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}

      - name: Build Project
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}

      - name: Deploy to Vercel
        run: |
          vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
          echo "### Frontend Deployed! :rocket:" >> $GITHUB_STEP_SUMMARY
          echo "URL: ${{ secrets.PRODUCTION_URL }}" >> $GITHUB_STEP_SUMMARY
```

---

## Phase 6: Post-Deployment Configuration

### 6.1 Update Vercel Environment Variables

After first backend deployment, get the Cloud Run URL:

```bash
gcloud run services describe drymdf-backend --region=us-central1 --format='value(status.url)'
# Example: https://drymdf-backend-abc123-uc.a.run.app
```

Update Vercel environment variables:

- `NEXT_PUBLIC_API_URL`: `https://drymdf-backend-abc123-uc.a.run.app/api`
- `NEXT_PUBLIC_WS_URL`: `wss://drymdf-backend-abc123-uc.a.run.app`

Trigger a new frontend deployment.

### 6.2 Update CORS Origin

Update the `PRODUCTION_URL` GitHub secret to match your Vercel production URL (e.g., `https://drymdf.vercel.app` or custom domain).

---

## Verification Checklist

### Backend Health Check

```bash
# Replace with your Cloud Run URL
curl https://drymdf-backend-abc123-uc.a.run.app/api/health
# Expected: {"status":"ok","timestamp":"...","uptime":...}
```

### API Documentation

Visit: `https://drymdf-backend-abc123-uc.a.run.app/api/docs`

### Frontend

Visit: `https://drymdf.vercel.app`

### End-to-End Test

1. Open the frontend
2. Write some markdown content
3. Click "Export to PDF"
4. Verify PDF generation works

### WebSocket Connection

Check browser console for WebSocket connection to Cloud Run.

---

## Troubleshooting

### Cloud Run Cold Starts

With `min-instances=0`, first request may take 10-30 seconds. This is expected on free tier.

### Puppeteer/Chromium Issues

If PDF generation fails, check Cloud Run logs:

```bash
gcloud run services logs read drymdf-backend --region=us-central1 --limit=50
```

Common fixes:

- Ensure `--disable-dev-shm-usage` flag is set
- Memory should be at least 1Gi

### Redis Connection Issues

Verify Upstash credentials:

- Check host doesn't have `redis://` prefix
- Ensure password is correct
- Test with Upstash CLI in their dashboard

### CORS Errors

Ensure `CORS_ORIGIN` in Cloud Run matches exactly with your frontend URL (including `https://`).

---

## Cost Monitoring

### GCP

```bash
# Check Cloud Run usage
gcloud run services describe drymdf-backend --region=us-central1

# Set budget alert (recommended)
# Go to: Billing → Budgets & alerts → Create budget
```

### Upstash

Monitor in Upstash dashboard → Database → Usage tab

### Vercel

Monitor in Vercel dashboard → Project → Analytics

---

## Security Notes

1. **GitHub Secrets**: All sensitive values stored in GitHub Secrets (encrypted at rest)
2. **Cloud Run**: Env vars visible in GCP Console to project admins only
3. **HTTPS**: All services use HTTPS by default
4. **Rate Limiting**: Backend has throttling enabled (10 req/min per IP)

---

## Maintenance

### Updating Dependencies

1. Update locally and test
2. Push to main branch
3. GitHub Actions will automatically deploy

### Rotating Secrets

1. Generate new credentials in respective platforms
2. Update GitHub Secrets
3. Trigger manual workflow run

### Scaling Up

If you exceed free tier:

- Cloud Run: Increase `max-instances` and memory
- Upstash: Upgrade to Pay-as-you-go ($0.2 per 100K commands)
- Vercel: Upgrade to Pro ($20/month)
