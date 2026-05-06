# Dio Editor

AI-powered automatic video editing for social media. Upload photos and video clips, describe your vision, and receive a professionally edited video optimized for TikTok, Reels, YouTube Shorts, Twitter, or LinkedIn.

## Architecture

```
User uploads media + optional prompt
        ↓
[FFmpeg Pre-Processor] — trim, crop, normalize, Ken Burns on photos
        ↓
[Claude Vision Analyzer] — mood, energy, quality analysis per asset
        ↓
[Claude Editorial Planner] — sequence, pacing, transitions, text overlays
        ↓
[Audio Service] — Pixabay/Freesound search + librosa beat detection
        ↓
[Remotion Compositor] — animations, transitions, text overlays
        ↓
[FFmpeg Finalizer] — mux audio, bitrate optimization, platform specs
        ↓
[R2/S3 Upload] — deliver via signed URL
```

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion |
| State | Zustand + TanStack React Query |
| Backend | FastAPI (Python 3.11) |
| Job Queue | Celery + Redis |
| Processing | FFmpeg via asyncio subprocess |
| Composition | Remotion 4 + Express.js wrapper |
| AI | Claude claude-sonnet-4-20250514 (vision + editorial planning) |
| Audio | Pixabay Music API + Freesound API + librosa beat detection |
| Storage | Cloudflare R2 (S3-compatible) |
| Database | PostgreSQL 15 via SQLAlchemy 2 + asyncpg + Alembic |
| iOS | Capacitor |
| Orchestration | Docker Compose |

## Quick Start

### 1. Clone & configure

```bash
cp .env.example .env
# Edit .env with your credentials
```

### 2. Start with Docker Compose

```bash
docker-compose up --build
```

Services start on:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Remotion renderer: http://localhost:3001

### 3. Run database migrations

```bash
docker-compose exec backend alembic upgrade head
```

## Supported Platforms

| Platform | Aspect | Optimal | Max |
|----------|--------|---------|-----|
| TikTok | 9:16 | 15s | 60s |
| Reels | 9:16 | 30s | 90s |
| YouTube Shorts | 9:16 | 45s | 60s |
| Twitter | 16:9 | 45s | 2:20 |
| LinkedIn | 16:9 | 60s | 10m |

## iOS App (Capacitor)

```bash
cd frontend
npm run cap:ios
```

Requires Xcode installed on macOS.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Claude API key |
| `S3_ENDPOINT_URL` | Cloudflare R2 or S3 endpoint |
| `S3_ACCESS_KEY_ID` | Storage access key |
| `S3_SECRET_ACCESS_KEY` | Storage secret |
| `S3_BUCKET_NAME` | Bucket name (default: dio-editor-media) |
| `S3_PUBLIC_URL` | Public base URL for assets |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `PIXABAY_API_KEY` | Pixabay free tier API key |
| `FREESOUND_API_KEY` | Freesound free tier API key |
| `REMOTION_SERVER_URL` | Remotion renderer URL (default: http://remotion:3001) |

## API Reference

```
POST /api/projects/upload         Upload media + start processing
GET  /api/projects/{id}           Get project status
GET  /api/jobs/{id}               Get job progress + output URL
GET  /api/audio/search            Search audio by mood + BPM
POST /api/audio/select            Select audio track for re-render
GET  /api/projects/{id}/download  Redirect to signed download URL
```

## Pipeline Steps

1. **Downloading assets** — Fetch from R2 to temp directory
2. **Analyzing media** — Claude vision on each asset (parallel, limit 5)
3. **Planning edit** — Claude creates full editorial plan
4. **Selecting audio** — Pixabay/Freesound search, local fallback
5. **Beat detection** — librosa BPM analysis
6. **Processing clips** — FFmpeg trim, crop, color grade, Ken Burns
7. **Compositing** — Remotion render with transitions and text
8. **Finalizing** — FFmpeg audio mux + bitrate enforcement
9. **Uploading** — R2 upload, signed URL generation
10. **Complete** — Project ready for download
