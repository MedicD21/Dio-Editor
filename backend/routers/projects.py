import os
import uuid
import asyncio
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from db import get_db
from models.project import Project
from models.job import Job
from schemas.project import ProjectResponse, UploadResponse
from schemas.job import JobResponse
from services.storage_service import storage_service
from services.ffmpeg_processor import FFmpegProcessor
from config import get_settings

try:
    import pillow_heif
    pillow_heif.register_heif_opener()
    from PIL import Image
    HEIC_SUPPORTED = True
except ImportError:
    HEIC_SUPPORTED = False

settings = get_settings()
router = APIRouter(prefix="/api/projects", tags=["projects"])

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif",
                      ".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v"}
VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v"}
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif"}

PLATFORM_SPECS = {
    "tiktok":         {"width": 1080, "height": 1920, "aspect": "9:16", "max_duration": 60,  "optimal_duration": 15, "fps": 30},
    "reels":          {"width": 1080, "height": 1920, "aspect": "9:16", "max_duration": 90,  "optimal_duration": 30, "fps": 30},
    "youtube_shorts": {"width": 1080, "height": 1920, "aspect": "9:16", "max_duration": 60,  "optimal_duration": 45, "fps": 30},
    "twitter":        {"width": 1280, "height": 720,  "aspect": "16:9", "max_duration": 140, "optimal_duration": 45, "fps": 30},
    "linkedin":       {"width": 1920, "height": 1080, "aspect": "16:9", "max_duration": 600, "optimal_duration": 60, "fps": 30},
}


def _get_content_type(ext: str) -> str:
    mapping = {
        ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
        ".gif": "image/gif", ".webp": "image/webp",
        ".mp4": "video/mp4", ".mov": "video/quicktime", ".avi": "video/avi",
        ".mkv": "video/x-matroska", ".webm": "video/webm", ".m4v": "video/mp4",
    }
    return mapping.get(ext.lower(), "application/octet-stream")


async def _convert_heic_to_jpeg(src: str, dst: str) -> None:
    from PIL import Image
    loop = asyncio.get_event_loop()
    def _convert():
        img = Image.open(src)
        img.save(dst, format="JPEG", quality=92)
    await loop.run_in_executor(None, _convert)


@router.post("/upload", response_model=UploadResponse)
async def upload_media(
    files: list[UploadFile] = File(...),
    platform: str = Form(...),
    processing_mode: str = Form("fast"),
    prompt: Optional[str] = Form(None),
    session_id: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
):
    if platform not in PLATFORM_SPECS:
        raise HTTPException(status_code=400, detail=f"Invalid platform: {platform}")
    if processing_mode not in {"fast", "pro_ai"}:
        raise HTTPException(status_code=400, detail=f"Invalid processing_mode: {processing_mode}")
    if len(files) > settings.max_upload_files:
        raise HTTPException(status_code=400, detail=f"Max {settings.max_upload_files} files allowed")

    user_session_id = session_id or str(uuid.uuid4())

    project = Project(
        user_session_id=user_session_id,
        platform=platform,
        user_prompt=prompt,
        status="pending",
    )
    db.add(project)
    await db.flush()

    initial_steps = [
        {"name": step, "status": "pending", "progress": 0, "message": ""}
        for step in [
            "Downloading assets", "Analyzing media", "Planning edit",
            "Selecting audio", "Beat detection", "Processing clips",
            "Compositing", "Finalizing", "Uploading", "Complete",
        ]
    ]
    job = Job(project_id=project.id, steps=initial_steps)
    db.add(job)
    await db.flush()

    project_id_str = str(project.id)
    temp_dir = Path(f"/tmp/dio/{project_id_str}")
    temp_dir.mkdir(parents=True, exist_ok=True)

    thumbnails: list[str] = []
    asset_count = 0

    ffmpeg_proc = FFmpegProcessor()

    for file in files:
        if not file.filename:
            continue
        original_ext = Path(file.filename).suffix.lower()
        if original_ext not in ALLOWED_EXTENSIONS:
            continue

        asset_id = str(uuid.uuid4())
        save_ext = original_ext
        local_path = temp_dir / f"{asset_id}{original_ext}"

        raw = await file.read()
        with open(local_path, "wb") as f:
            f.write(raw)

        if original_ext in {".heic", ".heif"} and HEIC_SUPPORTED:
            jpeg_path = temp_dir / f"{asset_id}.jpg"
            await _convert_heic_to_jpeg(str(local_path), str(jpeg_path))
            os.remove(local_path)
            local_path = jpeg_path
            save_ext = ".jpg"

        remote_key = storage_service.remote_key_for_asset(
            project_id_str, f"{asset_id}{save_ext}"
        )
        await storage_service.upload_file(
            str(local_path), remote_key, _get_content_type(save_ext)
        )

        thumb_path = temp_dir / f"{asset_id}_thumb.jpg"
        try:
            is_video = save_ext in VIDEO_EXTENSIONS
            await ffmpeg_proc.generate_thumbnail(str(local_path), str(thumb_path), is_video)
            thumb_key = storage_service.remote_key_for_thumbnail(
                project_id_str, f"{asset_id}_thumb.jpg"
            )
            thumb_url = await storage_service.upload_file(
                str(thumb_path), thumb_key, "image/jpeg"
            )
            thumbnails.append(thumb_url)
        except Exception:
            pass

        asset_count += 1

    project.asset_count = asset_count
    await db.flush()
    await db.commit()

    from tasks.render_task import render_video_task
    render_video_task.delay(project_id_str, str(job.id), None, processing_mode)

    return UploadResponse(
        project_id=project.id,
        job_id=job.id,
        thumbnails=thumbnails,
    )


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.get("/{project_id}/download")
async def download_project(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.status != "complete":
        raise HTTPException(status_code=400, detail="Project is not complete yet")

    output_key = storage_service.remote_key_for_output(project_id)
    signed_url = await storage_service.get_signed_url(output_key, expires_in=3600)
    return RedirectResponse(url=signed_url)
