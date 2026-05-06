#!/usr/bin/env sh
set -e

APP_ROLE="${APP_ROLE:-web}"

if [ "$APP_ROLE" = "worker" ]; then
  exec celery -A tasks.render_task worker --loglevel=info --concurrency="${CELERY_CONCURRENCY:-2}"
fi

if [ "$APP_ROLE" = "web" ]; then
  exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}"
fi

echo "Unknown APP_ROLE: $APP_ROLE"
exit 1
