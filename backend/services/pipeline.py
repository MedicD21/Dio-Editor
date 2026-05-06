import asyncio
import json
import os
import shutil
import time
import uuid
from pathlib import Path
from typing import Any, Optional

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import get_settings
from db import AsyncSessionLocal
from models.job import Job
from models.project import Project
from services.ai_analyzer import AIAnalyzer
from services.audio_service import AudioService, AudioTrack, LOCAL_FALLBACK_TRACKS
from services.editorial_planner import EditorialPlanner, PLATFORM_SPECS
from services.ffmpeg_processor import FFmpegProcessor
from services.storage_service import storage_service

settings = get_settings()

VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v"}

PIPELINE_STEPS = [
    "Downloading assets",
    "Analyzing media",
    "Planning edit",
    "Selecting audio",
    "Beat detection",
    "Processing clips",
    "Compositing",
    "Finalizing",
    "Uploading",
    "Complete",
]


async def _update_step(
    session: AsyncSession,
    job: Job,
    step_name: str,
    status: str,
    progress: int,
    message: str,
) -> None:
    steps = list(job.steps)
    for step in steps:
        if step["name"] == step_name:
            step["status"] = status
            step["progress"] = progress
            step["message"] = message
            break
    job.steps = steps
    session.add(job)
    await session.commit()


async def _update_project_status(
    session: AsyncSession, project: Project, status: str
) -> None:
    project.status = status
    session.add(project)
    await session.commit()


async def _call_remotion(payload: dict) -> dict:
    async with httpx.AsyncClient(timeout=620.0) as client:
        resp = await client.post(
            f"{settings.remotion_server_url}/render",
            json=payload,
        )
        resp.raise_for_status()
        return resp.json()


class Pipeline:
    def __init__(self):
        self.ffmpeg = FFmpegProcessor()
        self.ai = AIAnalyzer()
        self.planner = EditorialPlanner()
        self.audio_svc = AudioService()

    async def run(
        self,
        project_id: str,
        job_id: str,
        override_track_id: Optional[str] = None,
    ) -> None:
        start_time = time.time()
        temp_dir = Path(f"/tmp/dio/{project_id}")
        temp_dir.mkdir(parents=True, exist_ok=True)

        async with AsyncSessionLocal() as session:
            job_result = await session.execute(select(Job).where(Job.id == job_id))
            job = job_result.scalar_one()
            proj_result = await session.execute(
                select(Project).where(Project.id == project_id)
            )
            project = proj_result.scalar_one()

            try:
                await self._run_pipeline(
                    session, job, project, temp_dir, override_track_id, start_time
                )
            except Exception as exc:
                for step in job.steps:
                    if step["status"] == "active":
                        step["status"] = "failed"
                        step["message"] = str(exc)[:200]
                job.steps = list(job.steps)
                job.error_message = str(exc)[:500]
                session.add(job)
                project.status = "failed"
                session.add(project)
                await session.commit()
                raise
            finally:
                try:
                    shutil.rmtree(str(temp_dir), ignore_errors=True)
                except Exception:
                    pass

    async def _run_pipeline(
        self,
        session: AsyncSession,
        job: Job,
        project: Project,
        temp_dir: Path,
        override_track_id: Optional[str],
        start_time: float,
    ) -> None:
        platform = project.platform
        specs = PLATFORM_SPECS.get(platform, PLATFORM_SPECS["tiktok"])

        # Step 1: Download assets
        await _update_step(session, job, "Downloading assets", "active", 0, "Fetching uploaded assets...")
        await _update_project_status(session, project, "analyzing")

        assets_dir = temp_dir / "assets"
        assets_dir.mkdir(exist_ok=True)

        asset_files: list[dict] = []
        prefix = f"projects/{project.id}/assets/"

        bucket = storage_service.bucket

        import aioboto3
        boto_session = aioboto3.Session()
        client_kwargs = storage_service._client_kwargs()

        async with boto_session.client(**client_kwargs) as s3:
            paginator = s3.get_paginator("list_objects_v2")
            pages = paginator.paginate(Bucket=bucket, Prefix=f"projects/{project.id}/assets/")
            async for page in pages:
                for obj in page.get("Contents", []):
                    key = obj["Key"]
                    filename = Path(key).name
                    local_path = assets_dir / filename
                    await s3.download_file(bucket, key, str(local_path))
                    ext = Path(filename).suffix.lower()
                    asset_id = Path(filename).stem
                    asset_files.append({
                        "asset_id": asset_id,
                        "local_path": str(local_path),
                        "is_video": ext in VIDEO_EXTENSIONS,
                        "key": key,
                    })

        await _update_step(session, job, "Downloading assets", "complete", 100, f"Downloaded {len(asset_files)} assets")

        # Step 2: Analyze media
        await _update_step(session, job, "Analyzing media", "active", 0, "Running Claude vision analysis...")
        await _update_project_status(session, project, "analyzing")

        frames_dir = temp_dir / "frames"
        frames_dir.mkdir(exist_ok=True)

        analysis_inputs: list[dict] = []
        for af in asset_files:
            frame_path = str(frames_dir / f"{af['asset_id']}_frame.jpg")
            if af["is_video"]:
                try:
                    duration = await self.ffmpeg.get_video_duration(af["local_path"])
                    await self.ffmpeg.extract_frame(af["local_path"], frame_path, 1.0)
                except Exception:
                    duration = 5.0
                    shutil.copy(af["local_path"], frame_path) if af["local_path"].endswith((".jpg", ".jpeg", ".png")) else None
            else:
                shutil.copy(af["local_path"], frame_path)
                duration = None

            if os.path.exists(frame_path):
                analysis_inputs.append({
                    "asset_id": af["asset_id"],
                    "frame_path": frame_path,
                    "is_video": af["is_video"],
                    "duration": duration,
                    "local_path": af["local_path"],
                })

        analyses = await self.ai.analyze_assets(analysis_inputs)
        await _update_step(session, job, "Analyzing media", "complete", 100, f"Analyzed {len(analyses)} assets")

        # Step 3: Plan edit
        await _update_step(session, job, "Planning edit", "active", 0, "Creating editorial plan with Claude...")
        await _update_project_status(session, project, "planning")

        plan = await self.planner.create_plan(
            platform=platform,
            user_prompt=project.user_prompt or "",
            asset_analyses=analyses,
        )
        await _update_step(session, job, "Planning edit", "complete", 100, f"Plan created: {plan.get('title', 'Untitled')}")

        # Step 4: Select audio
        await _update_step(session, job, "Selecting audio", "active", 0, "Searching for matching audio track...")
        await _update_project_status(session, project, "processing")

        audio_plan = plan.get("audio", {})
        music_mood = plan.get("music_mood", "upbeat")
        bpm_range = tuple(plan.get("music_bpm_range", [90, 130]))

        tracks = await self.audio_svc.search_tracks(music_mood, bpm_range)

        if override_track_id:
            selected_track = next((t for t in tracks if t.id == override_track_id), None)
            if not selected_track:
                selected_track = self.audio_svc.get_best_track_for_mood(tracks, audio_plan.get("bpm_preference", 120))
        else:
            selected_track = self.audio_svc.get_best_track_for_mood(tracks, audio_plan.get("bpm_preference", 120))

        audio_path = str(temp_dir / "audio.mp3")
        await self.audio_svc.download_track(selected_track, audio_path)
        await _update_step(session, job, "Selecting audio", "complete", 100, f"Selected: {selected_track.title}")

        # Step 5: Beat detection
        await _update_step(session, job, "Beat detection", "active", 0, "Analyzing audio beats...")
        beat_times, detected_bpm = await asyncio.get_event_loop().run_in_executor(
            None, self.audio_svc.detect_beats, audio_path
        )
        await _update_step(session, job, "Beat detection", "complete", 100, f"Detected BPM: {detected_bpm:.1f}")

        # Step 6: Process clips
        await _update_step(session, job, "Processing clips", "active", 0, "Processing video clips with FFmpeg...")
        await _update_project_status(session, project, "processing")

        clips_dir = temp_dir / "clips"
        clips_dir.mkdir(exist_ok=True)

        asset_map = {af["asset_id"]: af for af in asset_files}
        color_grade = plan.get("color_grade_suggestion", "neutral")

        processed_clips: list[dict] = []
        total_clips = len(plan.get("clips", []))

        for idx, clip_def in enumerate(plan.get("clips", [])):
            asset_id = clip_def["asset_id"]
            asset_info = asset_map.get(asset_id)
            if not asset_info:
                continue

            clip_output = str(clips_dir / f"clip_{idx:03d}.mp4")
            is_photo = not asset_info["is_video"]
            screen_duration = clip_def.get("screen_duration", 3.0)
            zoom_effect = clip_def.get("zoom_effect")

            try:
                await self.ffmpeg.process_clip(
                    src=asset_info["local_path"],
                    output=clip_output,
                    platform_width=specs["width"],
                    platform_height=specs["height"],
                    clip_start=clip_def.get("clip_start", 0.0),
                    clip_end=clip_def.get("clip_end", screen_duration),
                    color_grade=color_grade,
                    is_photo=is_photo,
                    photo_duration=screen_duration,
                    zoom_effect=zoom_effect,
                    fps=specs["fps"],
                )
                processed_clips.append({
                    **clip_def,
                    "local_clip_path": clip_output,
                    "is_photo": is_photo,
                })
            except Exception as exc:
                print(f"Clip {idx} processing failed: {exc}, skipping")

            progress = int((idx + 1) / max(total_clips, 1) * 100)
            await _update_step(session, job, "Processing clips", "active", progress, f"Processed {idx+1}/{total_clips} clips")

        await _update_step(session, job, "Processing clips", "complete", 100, f"Processed {len(processed_clips)} clips")

        # Step 7: Composite
        await _update_step(session, job, "Compositing", "active", 0, "Compositing in Remotion...")
        await _update_project_status(session, project, "rendering")

        remotion_output = str(temp_dir / "remotion_output.mp4")
        remotion_success = False

        try:
            remotion_clips = []
            for pc in processed_clips:
                remotion_clips.append({
                    "asset_id": pc["asset_id"],
                    "asset_path": pc["local_clip_path"],
                    "is_photo": pc["is_photo"],
                    "clip_start": 0.0,
                    "clip_end": pc.get("screen_duration", 3.0),
                    "screen_duration": pc.get("screen_duration", 3.0),
                    "transition_in": pc.get("transition_in", "cut"),
                    "transition_duration": pc.get("transition_duration", 0.0),
                    "text_overlay": pc.get("text_overlay"),
                    "zoom_effect": pc.get("zoom_effect"),
                })

            remotion_payload = {
                "compositionId": "SocialVideo",
                "inputProps": {
                    "clips": remotion_clips,
                    "audio": {
                        "src": audio_path,
                        "mood": music_mood,
                        "bpm_preference": audio_plan.get("bpm_preference", 120),
                        "fade_in_duration": audio_plan.get("fade_in_duration", 1.5),
                        "fade_out_duration": audio_plan.get("fade_out_duration", 2.0),
                        "volume": audio_plan.get("volume", 0.7),
                    },
                    "totalDurationSeconds": plan.get("total_duration_seconds", 30),
                },
                "outputPath": remotion_output,
                "width": specs["width"],
                "height": specs["height"],
                "fps": specs["fps"],
            }

            result = await _call_remotion(remotion_payload)
            if result.get("success"):
                remotion_success = True
                await _update_step(session, job, "Compositing", "complete", 100, "Remotion compositing complete")
            else:
                raise RuntimeError(result.get("error", "Remotion failed"))

        except Exception as exc:
            print(f"Remotion failed: {exc}, falling back to FFmpeg concat")
            await self.ffmpeg.concatenate_clips(
                [pc["local_clip_path"] for pc in processed_clips],
                remotion_output,
                str(temp_dir),
            )
            await _update_step(session, job, "Compositing", "complete", 100, "FFmpeg fallback compositing complete")

        # Step 8: Finalize
        await _update_step(session, job, "Finalizing", "active", 0, "Final FFmpeg pass + audio mux...")

        final_output = str(temp_dir / "final.mp4")
        bitrate = "8M" if specs["aspect"] == "9:16" else "6M"

        video_duration = await self.ffmpeg.get_video_duration(remotion_output)

        await self.ffmpeg.mux_audio(
            video_path=remotion_output,
            audio_path=audio_path,
            output=final_output,
            fade_in=audio_plan.get("fade_in_duration", 1.5),
            fade_out=audio_plan.get("fade_out_duration", 2.0),
            volume=audio_plan.get("volume", 0.7),
            video_duration=video_duration,
            target_bitrate=bitrate,
        )
        await _update_step(session, job, "Finalizing", "complete", 100, "Final video ready")

        # Step 9: Upload
        await _update_step(session, job, "Uploading", "active", 0, "Uploading to storage...")

        output_key = storage_service.remote_key_for_output(str(project.id))
        output_url = await storage_service.upload_file(final_output, output_key, "video/mp4")

        await _update_step(session, job, "Uploading", "complete", 100, "Upload complete")

        # Step 10: Complete
        elapsed = time.time() - start_time
        job.output_url = output_url
        job.render_duration_seconds = elapsed
        session.add(job)

        await _update_step(session, job, "Complete", "complete", 100, f"Video ready in {elapsed:.1f}s")
        await _update_project_status(session, project, "complete")
