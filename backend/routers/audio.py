from fastapi import APIRouter, Query, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from db import get_db
from models.project import Project
from services.audio_service import audio_service, AudioTrack

router = APIRouter(prefix="/api/audio", tags=["audio"])


class SelectAudioRequest(BaseModel):
    project_id: str
    track_id: str


@router.get("/search", response_model=list[AudioTrack])
async def search_audio(
    mood: str = Query(..., description="Mood of the audio"),
    bpm_min: int = Query(60, description="Minimum BPM"),
    bpm_max: int = Query(160, description="Maximum BPM"),
):
    tracks = await audio_service.search_tracks(mood, (bpm_min, bpm_max))
    return tracks


@router.post("/select")
async def select_audio(
    body: SelectAudioRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Project).where(Project.id == body.project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    from tasks.render_task import render_video_task
    from models.job import Job
    from sqlalchemy import select as sa_select

    job_result = await db.execute(
        sa_select(Job).where(Job.project_id == project.id)
    )
    job = job_result.scalar_one_or_none()
    if job:
        initial_steps = [
            {"name": step, "status": "pending", "progress": 0, "message": ""}
            for step in [
                "Downloading assets", "Analyzing media", "Planning edit",
                "Selecting audio", "Beat detection", "Processing clips",
                "Compositing", "Finalizing", "Uploading", "Complete",
            ]
        ]
        job.steps = initial_steps
        job.output_url = None
        job.error_message = None
        project.status = "pending"
        await db.commit()
        render_video_task.delay(
            str(project.id), str(job.id), override_track_id=body.track_id
        )
        return {"status": "queued", "job_id": str(job.id)}

    return {"status": "no_job_found"}
