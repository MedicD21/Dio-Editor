import asyncio
import os
import json
from pathlib import Path
from typing import Optional

FFMPEG_TIMEOUT = 300

COLOR_GRADE_FILTERS = {
    "warm": "curves=r='0/0 0.5/0.6 1/1':g='0/0 0.5/0.5 1/0.9':b='0/0 0.5/0.4 1/0.8'",
    "cool": "curves=r='0/0 0.5/0.4 1/0.85':g='0/0 0.5/0.5 1/0.95':b='0/0 0.5/0.6 1/1'",
    "high_contrast": "curves=all='0/0 0.3/0.2 0.7/0.8 1/1'",
    "desaturated": "hue=s=0.4",
    "neutral": None,
}


async def _run_ffmpeg(args: list[str], timeout: int = FFMPEG_TIMEOUT) -> tuple[int, str, str]:
    cmd = ["ffmpeg", "-y"] + args
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
    except asyncio.TimeoutError:
        proc.kill()
        raise RuntimeError(f"FFmpeg timed out after {timeout}s: {' '.join(cmd)}")
    return proc.returncode, stdout.decode(), stderr.decode()


class FFmpegProcessor:
    async def get_video_duration(self, path: str) -> float:
        cmd = [
            "ffprobe", "-v", "quiet", "-print_format", "json",
            "-show_format", path,
        ]
        proc = await asyncio.create_subprocess_exec(
            *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=30)
        data = json.loads(stdout.decode())
        return float(data.get("format", {}).get("duration", 0.0))

    async def extract_frame(
        self, video_path: str, output_path: str, timestamp: float = 1.0
    ) -> None:
        ret, _, stderr = await _run_ffmpeg([
            "-ss", str(timestamp),
            "-i", video_path,
            "-frames:v", "1",
            "-q:v", "2",
            output_path,
        ])
        if ret != 0:
            ret, _, stderr = await _run_ffmpeg([
                "-i", video_path,
                "-frames:v", "1",
                "-q:v", "2",
                output_path,
            ])
            if ret != 0:
                raise RuntimeError(f"Failed to extract frame: {stderr}")

    async def generate_thumbnail(
        self, src: str, output: str, is_video: bool, size: str = "320x180"
    ) -> None:
        if is_video:
            ret, _, stderr = await _run_ffmpeg([
                "-ss", "1",
                "-i", src,
                "-frames:v", "1",
                "-vf", f"scale={size}:force_original_aspect_ratio=decrease,pad={size}:(ow-iw)/2:(oh-ih)/2",
                "-q:v", "5",
                output,
            ])
        else:
            ret, _, stderr = await _run_ffmpeg([
                "-i", src,
                "-vf", f"scale={size}:force_original_aspect_ratio=decrease,pad={size}:(ow-iw)/2:(oh-ih)/2",
                "-q:v", "5",
                output,
            ])
        if ret != 0:
            raise RuntimeError(f"Thumbnail generation failed: {stderr}")

    async def process_clip(
        self,
        src: str,
        output: str,
        platform_width: int,
        platform_height: int,
        clip_start: float,
        clip_end: float,
        color_grade: str = "neutral",
        is_photo: bool = False,
        photo_duration: float = 3.0,
        zoom_effect: Optional[dict] = None,
        fps: int = 30,
    ) -> None:
        grade_filter = COLOR_GRADE_FILTERS.get(color_grade)
        w, h = platform_width, platform_height

        if is_photo:
            await self._process_photo(
                src, output, w, h, photo_duration, grade_filter, zoom_effect, fps
            )
        else:
            await self._process_video_clip(
                src, output, w, h, clip_start, clip_end, grade_filter, fps
            )

    async def _process_video_clip(
        self,
        src: str,
        output: str,
        w: int,
        h: int,
        clip_start: float,
        clip_end: float,
        grade_filter: Optional[str],
        fps: int,
    ) -> None:
        duration = max(clip_end - clip_start, 0.1)

        scale_crop = (
            f"scale=iw*{h}/ih:{h},crop={w}:{h}:(iw-{w})/2:0"
            if w / h < 1
            else f"scale={w}:ih*{w}/iw,crop={w}:{h}:0:(ih-{h})/2"
        )

        vf_parts = [scale_crop, f"fps={fps}"]
        if grade_filter:
            vf_parts.append(grade_filter)
        vf_parts.append("loudnorm=I=-16:TP=-1.5:LRA=11" if False else "")
        vf_parts = [p for p in vf_parts if p]

        af = "loudnorm=I=-16:TP=-1.5:LRA=11"
        vf = ",".join(vf_parts)

        ret, _, stderr = await _run_ffmpeg([
            "-ss", str(clip_start),
            "-t", str(duration),
            "-i", src,
            "-vf", vf,
            "-af", af,
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "18",
            "-c:a", "aac",
            "-b:a", "192k",
            "-movflags", "+faststart",
            output,
        ])
        if ret != 0:
            raise RuntimeError(f"Video clip processing failed: {stderr[:500]}")

    async def _process_photo(
        self,
        src: str,
        output: str,
        w: int,
        h: int,
        duration: float,
        grade_filter: Optional[str],
        zoom_effect: Optional[dict],
        fps: int,
    ) -> None:
        total_frames = int(duration * fps)
        zoom_from = zoom_effect.get("from", 1.0) if zoom_effect else 1.0
        zoom_to = zoom_effect.get("to", 1.05) if zoom_effect else 1.05

        d = zoom_to - zoom_from
        zoompan = (
            f"zoompan=z='if(lte(on,1),{zoom_from},min(zoom+{d}/{total_frames},{zoom_to}))':"
            f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={total_frames}:s={w}x{h}:fps={fps}"
        )

        scale_crop = (
            f"scale=iw*{h}/ih:{h},crop={w}:{h}:(iw-{w})/2:0"
            if w / h < 1
            else f"scale={w}:ih*{w}/iw,crop={w}:{h}:0:(ih-{h})/2"
        )

        vf_parts = [scale_crop, zoompan]
        if grade_filter:
            vf_parts.append(grade_filter)
        vf = ",".join(vf_parts)

        ret, _, stderr = await _run_ffmpeg([
            "-loop", "1",
            "-i", src,
            "-vf", vf,
            "-t", str(duration),
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "18",
            "-pix_fmt", "yuv420p",
            "-an",
            "-movflags", "+faststart",
            output,
        ])
        if ret != 0:
            raise RuntimeError(f"Photo processing failed: {stderr[:500]}")

    async def concatenate_clips(
        self, clip_paths: list[str], output: str, temp_dir: str
    ) -> None:
        list_file = os.path.join(temp_dir, "concat_list.txt")
        with open(list_file, "w") as f:
            for p in clip_paths:
                f.write(f"file '{p}'\n")

        ret, _, stderr = await _run_ffmpeg([
            "-f", "concat",
            "-safe", "0",
            "-i", list_file,
            "-c", "copy",
            output,
        ])
        if ret != 0:
            raise RuntimeError(f"Concatenation failed: {stderr[:500]}")

    async def mux_audio(
        self,
        video_path: str,
        audio_path: str,
        output: str,
        fade_in: float = 1.5,
        fade_out: float = 2.0,
        volume: float = 0.7,
        video_duration: Optional[float] = None,
        target_bitrate: str = "8M",
    ) -> None:
        if video_duration is None:
            video_duration = await self.get_video_duration(video_path)

        af = (
            f"afade=t=in:st=0:d={fade_in},"
            f"afade=t=out:st={max(0, video_duration - fade_out)}:d={fade_out},"
            f"volume={volume}"
        )

        ret, _, stderr = await _run_ffmpeg([
            "-i", video_path,
            "-stream_loop", "-1",
            "-i", audio_path,
            "-map", "0:v:0",
            "-map", "1:a:0",
            "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
            "-af", af,
            "-t", str(video_duration),
            "-c:v", "libx264",
            "-preset", "fast",
            "-b:v", target_bitrate,
            "-c:a", "aac",
            "-b:a", "192k",
            "-movflags", "+faststart",
            output,
        ])
        if ret != 0:
            raise RuntimeError(f"Audio mux failed: {stderr[:500]}")

    async def encode_final(
        self,
        input_path: str,
        output_path: str,
        width: int,
        height: int,
        bitrate: str = "8M",
        fps: int = 30,
    ) -> None:
        ret, _, stderr = await _run_ffmpeg([
            "-i", input_path,
            "-vf", f"scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2,fps={fps}",
            "-c:v", "libx264",
            "-preset", "medium",
            "-b:v", bitrate,
            "-maxrate", bitrate,
            "-bufsize", f"{int(bitrate[:-1]) * 2}M",
            "-c:a", "aac",
            "-b:a", "192k",
            "-movflags", "+faststart",
            "-pix_fmt", "yuv420p",
            output_path,
        ])
        if ret != 0:
            raise RuntimeError(f"Final encode failed: {stderr[:500]}")
