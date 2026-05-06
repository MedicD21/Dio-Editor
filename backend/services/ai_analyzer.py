import asyncio
import base64
import json
import os
import re
from pathlib import Path
from typing import Any

import anthropic

from config import get_settings

settings = get_settings()

ASSET_ANALYSIS_PROMPT = """Analyze this media asset and return ONLY a JSON object with no explanation:
{
  "asset_id": "{asset_id}",
  "type": "photo" | "video",
  "duration_seconds": float | null,
  "subjects": ["list of main subjects visible"],
  "mood": "one word: energetic|calm|dramatic|joyful|melancholic|tense|romantic|adventurous",
  "energy_level": 1-10,
  "color_palette": ["dominant color names"],
  "lighting": "bright|moody|golden_hour|overcast|night|studio",
  "motion_level": 1-10,
  "suggested_duration": float,
  "quality_score": 1-10,
  "tags": ["descriptive tags"]
}"""

CONCURRENCY_LIMIT = 5
MAX_RETRIES = 3


def _extract_json(text: str) -> dict:
    text = text.strip()
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        return json.loads(match.group())
    return json.loads(text)


async def _analyze_single_asset(
    client: anthropic.AsyncAnthropic,
    asset_id: str,
    frame_path: str,
    semaphore: asyncio.Semaphore,
) -> dict[str, Any]:
    prompt = ASSET_ANALYSIS_PROMPT.replace("{asset_id}", asset_id)

    with open(frame_path, "rb") as f:
        image_data = base64.standard_b64encode(f.read()).decode("utf-8")

    ext = Path(frame_path).suffix.lower()
    media_type_map = {
        ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
        ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif",
    }
    media_type = media_type_map.get(ext, "image/jpeg")

    for attempt in range(MAX_RETRIES):
        try:
            async with semaphore:
                response = await client.messages.create(
                    model="claude-sonnet-4-20250514",
                    max_tokens=1024,
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "image",
                                    "source": {
                                        "type": "base64",
                                        "media_type": media_type,
                                        "data": image_data,
                                    },
                                },
                                {"type": "text", "text": prompt},
                            ],
                        }
                    ],
                )
            result = _extract_json(response.content[0].text)
            result["asset_id"] = asset_id
            return result
        except (json.JSONDecodeError, anthropic.APIError) as exc:
            if attempt == MAX_RETRIES - 1:
                return {
                    "asset_id": asset_id,
                    "type": "photo",
                    "duration_seconds": None,
                    "subjects": ["unknown"],
                    "mood": "calm",
                    "energy_level": 5,
                    "color_palette": ["neutral"],
                    "lighting": "bright",
                    "motion_level": 3,
                    "suggested_duration": 3.0,
                    "quality_score": 5,
                    "tags": [],
                    "error": str(exc),
                }
            wait = 2 ** attempt
            await asyncio.sleep(wait)

    return {"asset_id": asset_id, "error": "max retries exceeded"}


class AIAnalyzer:
    def __init__(self):
        self.client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    async def analyze_assets(
        self,
        assets: list[dict],
    ) -> list[dict[str, Any]]:
        """
        assets: [{"asset_id": str, "frame_path": str, "is_video": bool, "duration": float|None}]
        Returns list of analysis dicts.
        """
        semaphore = asyncio.Semaphore(CONCURRENCY_LIMIT)

        tasks = [
            _analyze_single_asset(
                self.client,
                asset["asset_id"],
                asset["frame_path"],
                semaphore,
            )
            for asset in assets
        ]
        results = await asyncio.gather(*tasks, return_exceptions=False)

        for i, asset in enumerate(assets):
            if results[i].get("duration_seconds") is None and asset.get("duration"):
                results[i]["duration_seconds"] = asset["duration"]
            if asset.get("is_video"):
                results[i]["type"] = "video"
            else:
                results[i]["type"] = "photo"

        return list(results)
