# Dio Editor

AI-powered automatic video editing for social media. Upload photos/video clips, add an optional prompt, and generate a finished video optimized for TikTok, Reels, YouTube Shorts, Twitter, or LinkedIn.

## Architecture

```text
Upload media + optional prompt
        ↓
FFmpeg pre-processing (trim, crop, normalize, Ken Burns)
        ↓
Claude vision analysis (mood, energy, quality)
        ↓
Claude editorial planning (sequence, pacing, overlays)
        ↓
Audio selection (Pixabay/Freesound + beat analysis)
        ↓
Remotion composition
        ↓
FFmpeg finalization (mux + platform constraints)
        ↓
S3/R2 upload + signed download
```

## Stack

- Frontend: Next.js 14 (App Router), TypeScript, Tailwind, Framer Motion
- Backend API: FastAPI (Python 3.11)
- Worker: Celery + Redis
- Rendering: Remotion 4
- Storage: S3-compatible (Cloudflare R2 supported)
- Database: PostgreSQL + SQLAlchemy + asyncpg
- Mobile: Capacitor iOS shell
- Local orchestration: Docker Compose

## Prerequisites

- Docker + Docker Compose
- Node.js 20+
- npm 10+
- Xcode (for iOS)
- API keys and infrastructure credentials listed in `.env.example`

## Environment Setup

1. Copy env file:

```bash
cp .env.example .env
```

2. Fill required variables in `.env`:

- `ANTHROPIC_API_KEY`
- `DATABASE_URL`
- `REDIS_URL`
- `S3_ENDPOINT_URL`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`, `S3_PUBLIC_URL`
- `PIXABAY_API_KEY`, `FREESOUND_API_KEY`
- `REMOTION_SERVER_URL` (local default works with docker compose)

## Local Development (Docker)

1. Build and start all services:

```bash
docker-compose up --build
```

2. Run migrations:

```bash
docker-compose exec backend alembic upgrade head
```

3. Access services:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- Remotion: `http://localhost:3001`
- Redis: `localhost:6379`

## Local Testing and Verification

Run these whenever you change code.

### Frontend

```bash
cd frontend
npm install
npm run build
```

Notes:
- `npm run build` performs type checks and catches Next.js compile issues.
- If you want linting, add an ESLint config once and then run `npm run lint`.

### Backend API

```bash
# from repo root (services up)
curl http://localhost:8000/health
```

Expected response contains `"status":"ok"`.

### End-to-end smoke test

1. Open `http://localhost:3000`
2. Upload at least one media file
3. Select a platform and click `CREATE VIDEO`
4. Confirm job progress updates in `/projects/{id}`
5. Confirm final video player and export panel appear

## Railway Deployment (recommended for iOS device testing)

Use Railway-hosted HTTPS services so the Capacitor app can call your backend from simulator/device.

### Services to create

- `backend-api` from `backend/` (Dockerfile)
- `backend-worker` from `backend/` (Dockerfile)
- `remotion` from `remotion-renderer/` (Dockerfile)
- `redis` (Railway Redis service)

### Required Railway variables

Set on both `backend-api` and `backend-worker`:

- `APP_ROLE`:
  - `web` for `backend-api`
  - `worker` for `backend-worker`
- `ANTHROPIC_API_KEY`
- `DATABASE_URL`
- `REDIS_URL`
- `S3_ENDPOINT_URL`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_BUCKET_NAME`
- `S3_PUBLIC_URL`
- `PIXABAY_API_KEY`
- `FREESOUND_API_KEY`
- `SESSION_SECRET`

After `remotion` deploys, set:

- `REMOTION_SERVER_URL=https://<your-remotion-service>.up.railway.app`

### Backend health check (Railway)

```bash
curl https://<your-backend-api>.up.railway.app/health
```

## iOS Capacitor Setup and Testing

### Build iOS shell against Railway API

```bash
cd frontend
npm install
NEXT_PUBLIC_API_URL=https://<your-backend-api>.up.railway.app npm run cap:sync
npx cap open ios
```

Important:
- `NEXT_PUBLIC_API_URL` is compiled into the web bundle used by Capacitor.
- Re-run `NEXT_PUBLIC_API_URL=... npm run cap:sync` whenever API URL changes.

### Simulator/device smoke test

1. Run the app from Xcode
2. Upload media from device/simulator
3. Start a render
4. Verify progress updates and final video playback
5. Verify export/download works

## API Reference

```text
POST /api/projects/upload         Upload media + start processing
GET  /api/projects/{id}           Get project status
GET  /api/jobs/{id}               Get job progress + output URL
GET  /api/audio/search            Search audio by mood + BPM
POST /api/audio/select            Select audio track for re-render
GET  /api/projects/{id}/download  Redirect to signed download URL
GET  /health                      Service health
```

## Supported Platforms

| Platform | Aspect | Optimal | Max |
|----------|--------|---------|-----|
| TikTok | 9:16 | 15s | 60s |
| Reels | 9:16 | 30s | 90s |
| YouTube Shorts | 9:16 | 45s | 60s |
| Twitter | 16:9 | 45s | 2:20 |
| LinkedIn | 16:9 | 60s | 10m |

## Troubleshooting

- Build fails in frontend due to types:
  - Run `cd frontend && npm run build` and fix reported TypeScript path/line.
- iOS app still calling localhost:
  - Rebuild bundle with `NEXT_PUBLIC_API_URL=... npm run cap:sync` and reinstall app from Xcode.
- Jobs not processing:
  - Verify `backend-worker` is running and `REDIS_URL` is valid.
- Render step fails:
  - Verify `REMOTION_SERVER_URL` points to live remotion service.
