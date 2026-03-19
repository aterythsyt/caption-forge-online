---
title: Caption Forge Online
emoji: 🎬
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
---

# Caption Forge Online

Online AI caption editor for Urdu, Hindi, Hinglish, and Roman Urdu.

## Hosted stack

- FastAPI backend
- Static Next.js frontend served by FastAPI
- FFmpeg audio extraction
- Hugging Face Spaces for timed transcription
- External OpenAI-compatible model for AI-enhanced Roman cleanup

## Required environment variables

- `AGENT_ROUTER_BASE_URL`
- `AGENT_ROUTER_MODEL`
- `AGENT_ROUTER_TOKEN`
- `ONLINE_TIMESTAMP_API_URL`
- `ONLINE_LARGE_TRANSCRIPT_SPACE`

## Optional environment variables

- `MAX_UPLOAD_SIZE_MB`
- `PROJECT_RETENTION_HOURS`
- `ONLINE_SPACE_TIMEOUT_SECONDS`
- `AGENT_ROUTER_TIMEOUT_SECONDS`

## Local run

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Notes

- Set `PROJECT_RETENTION_HOURS=24` on free hosting to auto-clean old uploads.
- Frontend is built as a static export inside the Docker image.
- The public app expects `/api/*` and `/media/*` on the same host.
