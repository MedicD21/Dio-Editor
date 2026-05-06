import asyncio
import os
import uuid
from typing import Optional
import httpx
from pydantic import BaseModel

from config import get_settings

settings = get_settings()

PIXABAY_MOOD_MAP = {
    "energetic": "electronic",
    "chill": "ambient",
    "emotional": "classical",
    "dramatic": "cinematic",
    "upbeat": "pop",
    "dark": "dark",
    "inspirational": "inspirational",
    "cinematic": "cinematic",
}

LOCAL_FALLBACK_TRACKS = [
    {
        "id": "local_1", "title": "Energy Drive", "artist": "Pixabay Music",
        "duration": 120.0, "bpm": 128.0, "mood": "energetic",
        "preview_url": "https://cdn.pixabay.com/download/audio/2022/08/02/audio_884fe92c21.mp3",
        "download_url": "https://cdn.pixabay.com/download/audio/2022/08/02/audio_884fe92c21.mp3",
        "source": "local",
    },
    {
        "id": "local_2", "title": "Chill Lofi Beats", "artist": "Pixabay Music",
        "duration": 180.0, "bpm": 85.0, "mood": "chill",
        "preview_url": "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3",
        "download_url": "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3",
        "source": "local",
    },
    {
        "id": "local_3", "title": "Emotional Piano", "artist": "Pixabay Music",
        "duration": 150.0, "bpm": 72.0, "mood": "emotional",
        "preview_url": "https://cdn.pixabay.com/download/audio/2022/03/15/audio_9f2c0b4a12.mp3",
        "download_url": "https://cdn.pixabay.com/download/audio/2022/03/15/audio_9f2c0b4a12.mp3",
        "source": "local",
    },
    {
        "id": "local_4", "title": "Epic Cinematic", "artist": "Pixabay Music",
        "duration": 200.0, "bpm": 90.0, "mood": "dramatic",
        "preview_url": "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d1718ab41b.mp3",
        "download_url": "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d1718ab41b.mp3",
        "source": "local",
    },
    {
        "id": "local_5", "title": "Happy Vibes", "artist": "Pixabay Music",
        "duration": 140.0, "bpm": 118.0, "mood": "upbeat",
        "preview_url": "https://cdn.pixabay.com/download/audio/2021/11/25/audio_91b32e02d0.mp3",
        "download_url": "https://cdn.pixabay.com/download/audio/2021/11/25/audio_91b32e02d0.mp3",
        "source": "local",
    },
    {
        "id": "local_6", "title": "Dark Tension", "artist": "Pixabay Music",
        "duration": 160.0, "bpm": 100.0, "mood": "dark",
        "preview_url": "https://cdn.pixabay.com/download/audio/2022/04/07/audio_c8a3a50f4f.mp3",
        "download_url": "https://cdn.pixabay.com/download/audio/2022/04/07/audio_c8a3a50f4f.mp3",
        "source": "local",
    },
    {
        "id": "local_7", "title": "Rise Up", "artist": "Pixabay Music",
        "duration": 170.0, "bpm": 110.0, "mood": "inspirational",
        "preview_url": "https://cdn.pixabay.com/download/audio/2022/07/11/audio_e8cae7e29f.mp3",
        "download_url": "https://cdn.pixabay.com/download/audio/2022/07/11/audio_e8cae7e29f.mp3",
        "source": "local",
    },
    {
        "id": "local_8", "title": "Cinematic Journey", "artist": "Pixabay Music",
        "duration": 240.0, "bpm": 96.0, "mood": "cinematic",
        "preview_url": "https://cdn.pixabay.com/download/audio/2022/09/03/audio_93af1e02b8.mp3",
        "download_url": "https://cdn.pixabay.com/download/audio/2022/09/03/audio_93af1e02b8.mp3",
        "source": "local",
    },
]


class AudioTrack(BaseModel):
    id: str
    title: str
    artist: str
    duration: float
    bpm: Optional[float]
    mood: str
    preview_url: str
    download_url: str
    source: str


class AudioService:
    async def search_pixabay_music(
        self, mood: str, bpm_range: tuple[int, int]
    ) -> list[AudioTrack]:
        if not settings.pixabay_api_key:
            return []
        category = PIXABAY_MOOD_MAP.get(mood, "ambient")
        params = {
            "key": settings.pixabay_api_key,
            "mood": category,
            "bpm_from": bpm_range[0],
            "bpm_to": bpm_range[1],
            "per_page": 10,
        }
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get("https://pixabay.com/api/music/", params=params)
                resp.raise_for_status()
                data = resp.json()
                tracks = []
                for hit in data.get("hits", []):
                    tracks.append(AudioTrack(
                        id=f"pixabay_{hit['id']}",
                        title=hit.get("tags", "Unknown"),
                        artist=hit.get("user", "Pixabay"),
                        duration=float(hit.get("duration", 60)),
                        bpm=float(hit.get("bpm", 0)) or None,
                        mood=mood,
                        preview_url=hit.get("previewURL", ""),
                        download_url=hit.get("previewURL", ""),
                        source="pixabay",
                    ))
                return tracks
        except Exception:
            return []

    async def search_freesound(
        self, mood: str, tags: list[str]
    ) -> list[AudioTrack]:
        if not settings.freesound_api_key:
            return []
        query = f"{mood} {' '.join(tags[:3])}"
        params = {
            "token": settings.freesound_api_key,
            "query": query,
            "filter": "duration:[10 TO 180] type:mp3",
            "fields": "id,name,username,duration,previews,tags",
            "page_size": 10,
        }
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(
                    "https://freesound.org/apiv2/search/text/", params=params
                )
                resp.raise_for_status()
                data = resp.json()
                tracks = []
                for result in data.get("results", []):
                    preview = result.get("previews", {}).get("preview-hq-mp3", "")
                    if not preview:
                        continue
                    tracks.append(AudioTrack(
                        id=f"freesound_{result['id']}",
                        title=result.get("name", "Unknown"),
                        artist=result.get("username", "Freesound"),
                        duration=float(result.get("duration", 60)),
                        bpm=None,
                        mood=mood,
                        preview_url=preview,
                        download_url=preview,
                        source="freesound",
                    ))
                return tracks
        except Exception:
            return []

    def detect_beats(self, audio_file_path: str) -> tuple[list[float], float]:
        try:
            import librosa
            y, sr = librosa.load(audio_file_path, sr=None)
            tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
            beat_times = librosa.frames_to_time(beat_frames, sr=sr)
            return beat_times.tolist(), float(tempo)
        except Exception:
            return [], 120.0

    async def search_tracks(
        self, mood: str, bpm_range: tuple[int, int] = (80, 140)
    ) -> list[AudioTrack]:
        pixabay_task = self.search_pixabay_music(mood, bpm_range)
        freesound_task = self.search_freesound(mood, [mood, "music", "background"])
        pixabay_results, freesound_results = await asyncio.gather(
            pixabay_task, freesound_task
        )
        combined = pixabay_results + freesound_results
        if not combined:
            fallback_mood = mood.lower()
            combined = [
                AudioTrack(**t) for t in LOCAL_FALLBACK_TRACKS
                if t["mood"] == fallback_mood
            ]
            if not combined:
                combined = [AudioTrack(**LOCAL_FALLBACK_TRACKS[0])]
        return combined[:10]

    async def download_track(self, track: AudioTrack, output_path: str) -> str:
        try:
            async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
                resp = await client.get(track.download_url)
                resp.raise_for_status()
                with open(output_path, "wb") as f:
                    f.write(resp.content)
            return output_path
        except Exception:
            local_fallback = next(
                (t for t in LOCAL_FALLBACK_TRACKS if t["mood"] == track.mood),
                LOCAL_FALLBACK_TRACKS[0],
            )
            async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
                resp = await client.get(local_fallback["download_url"])
                resp.raise_for_status()
                with open(output_path, "wb") as f:
                    f.write(resp.content)
            return output_path

    def get_best_track_for_mood(self, tracks: list[AudioTrack], bpm_preference: int) -> AudioTrack:
        if not tracks:
            return AudioTrack(**LOCAL_FALLBACK_TRACKS[0])
        scored = []
        for t in tracks:
            score = 0
            if t.bpm:
                score -= abs(t.bpm - bpm_preference)
            scored.append((score, t))
        scored.sort(key=lambda x: x[0], reverse=True)
        return scored[0][1]


audio_service = AudioService()
