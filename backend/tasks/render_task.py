import asyncio
from celery import Celery
from config import get_settings

settings = get_settings()

celery_app = Celery(
    "dio_editor",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
)


@celery_app.task(
    bind=True,
    max_retries=2,
    soft_time_limit=900,
    name="tasks.render_task.render_video_task",
)
def render_video_task(
    self,
    project_id: str,
    job_id: str,
    override_track_id: str | None = None,
):
    from services.pipeline import Pipeline

    async def _run():
        pipeline = Pipeline()
        await pipeline.run(project_id, job_id, override_track_id)

    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(_run())
        finally:
            loop.close()
    except Exception as exc:
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc, countdown=30)
        raise
