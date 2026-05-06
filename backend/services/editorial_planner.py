import asyncio
import json
import re
from typing import Any

import anthropic

from config import get_settings

settings = get_settings()

PLATFORM_SPECS = {
    "tiktok":         {"width": 1080, "height": 1920, "aspect": "9:16", "max_duration": 60,  "optimal_duration": 15, "fps": 30},
    "reels":          {"width": 1080, "height": 1920, "aspect": "9:16", "max_duration": 90,  "optimal_duration": 30, "fps": 30},
    "youtube_shorts": {"width": 1080, "height": 1920, "aspect": "9:16", "max_duration": 60,  "optimal_duration": 45, "fps": 30},
    "twitter":        {"width": 1280, "height": 720,  "aspect": "16:9", "max_duration": 140, "optimal_duration": 45, "fps": 30},
    "linkedin":       {"width": 1920, "height": 1080, "aspect": "16:9", "max_duration": 600, "optimal_duration": 60, "fps": 30},
}

EDITORIAL_SYSTEM_PROMPT = """You are a world-class video editor and creative director specializing in social media content.
You think like a professional editor — you understand pacing, narrative arc, visual rhythm,
emotional flow, and platform-specific best practices.

Given analyzed media assets and a user's creative intent, produce a precise editorial plan
that results in a compelling, professional social media video.

Your decisions must be INTENTIONAL — not random. Apply these principles:
- Narrative arc: establish → develop → climax → resolve
- Lead with the strongest hook in the first 2 seconds
- Vary pacing — don't maintain the same rhythm throughout
- Match audio energy to visual energy
- Prioritize quality_score >= 7 assets; use lower-quality only as filler
- Platform-specific attention patterns: TikTok needs immediate hook, LinkedIn can breathe

Return ONLY valid JSON. No explanation. No markdown fences."""

EDITORIAL_USER_PROMPT = """Platform: {platform}
Platform specs: {platform_specs}
Target duration: {optimal_duration} seconds (max {max_duration}s)
User intent: {user_prompt}
Total assets available: {asset_count}

Asset analyses:
{asset_analyses_json}

Return this exact JSON structure:
{{
  "title": "suggested project title",
  "total_duration_seconds": float,
  "narrative_arc": "brief description of story being told",
  "hook_strategy": "what happens in first 2 seconds",
  "pacing": "slow|medium|fast|dynamic",
  "color_grade_suggestion": "warm|cool|neutral|high_contrast|desaturated",
  "music_mood": "energetic|chill|emotional|dramatic|upbeat|dark|inspirational|cinematic",
  "music_bpm_range": [int, int],
  "clips": [
    {{
      "asset_id": "string",
      "clip_start": float,
      "clip_end": float,
      "screen_duration": float,
      "transition_in": "cut|crossfade|zoom_in|zoom_out|slide_left|slide_right|none",
      "transition_duration": float,
      "text_overlay": null,
      "zoom_effect": null,
      "reasoning": "why this clip is placed here"
    }}
  ],
  "audio": {{
    "mood": "string",
    "bpm_preference": int,
    "fade_in_duration": 1.5,
    "fade_out_duration": 2.0,
    "volume": 0.7
  }}
}}"""

MAX_RETRIES = 3


def _extract_json(text: str) -> dict:
    text = text.strip()
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        return json.loads(match.group())
    return json.loads(text)


class EditorialPlanner:
    def __init__(self):
        self.client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    async def create_plan(
        self,
        platform: str,
        user_prompt: str,
        asset_analyses: list[dict[str, Any]],
    ) -> dict[str, Any]:
        specs = PLATFORM_SPECS.get(platform, PLATFORM_SPECS["tiktok"])
        user_message = EDITORIAL_USER_PROMPT.format(
            platform=platform,
            platform_specs=json.dumps(specs),
            optimal_duration=specs["optimal_duration"],
            max_duration=specs["max_duration"],
            user_prompt=user_prompt or "Make it look amazing and engaging",
            asset_count=len(asset_analyses),
            asset_analyses_json=json.dumps(asset_analyses, indent=2),
        )

        for attempt in range(MAX_RETRIES):
            try:
                response = await self.client.messages.create(
                    model="claude-sonnet-4-20250514",
                    max_tokens=4096,
                    system=EDITORIAL_SYSTEM_PROMPT,
                    messages=[{"role": "user", "content": user_message}],
                )
                plan = _extract_json(response.content[0].text)
                plan = self._validate_and_fix_plan(plan, asset_analyses, specs)
                return plan
            except (json.JSONDecodeError, anthropic.APIError, KeyError) as exc:
                if attempt == MAX_RETRIES - 1:
                    return self._fallback_plan(asset_analyses, specs, platform)
                await asyncio.sleep(2 ** attempt)

        return self._fallback_plan(asset_analyses, specs, platform)

    def _validate_and_fix_plan(
        self,
        plan: dict,
        analyses: list[dict],
        specs: dict,
    ) -> dict:
        valid_ids = {a["asset_id"] for a in analyses}
        clips = plan.get("clips", [])
        valid_clips = [c for c in clips if c.get("asset_id") in valid_ids]

        if not valid_clips:
            for analysis in analyses:
                dur = analysis.get("suggested_duration", 3.0)
                valid_clips.append({
                    "asset_id": analysis["asset_id"],
                    "clip_start": 0.0,
                    "clip_end": analysis.get("duration_seconds") or dur,
                    "screen_duration": dur,
                    "transition_in": "cut",
                    "transition_duration": 0.0,
                    "text_overlay": None,
                    "zoom_effect": None,
                    "reasoning": "fallback",
                })

        plan["clips"] = valid_clips

        total = sum(c.get("screen_duration", 3.0) for c in valid_clips)
        plan["total_duration_seconds"] = min(total, specs["max_duration"])

        if "audio" not in plan:
            plan["audio"] = {
                "mood": plan.get("music_mood", "upbeat"),
                "bpm_preference": 120,
                "fade_in_duration": 1.5,
                "fade_out_duration": 2.0,
                "volume": 0.7,
            }

        return plan

    def _fallback_plan(
        self,
        analyses: list[dict],
        specs: dict,
        platform: str,
    ) -> dict:
        clips = []
        total = 0.0
        for analysis in analyses:
            dur = min(analysis.get("suggested_duration", 3.0), 5.0)
            if total + dur > specs["max_duration"]:
                break
            asset_dur = analysis.get("duration_seconds") or dur
            clips.append({
                "asset_id": analysis["asset_id"],
                "clip_start": 0.0,
                "clip_end": min(asset_dur, dur),
                "screen_duration": dur,
                "transition_in": "cut",
                "transition_duration": 0.0,
                "text_overlay": None,
                "zoom_effect": None,
                "reasoning": "fallback arrangement",
            })
            total += dur

        return {
            "title": "My Video",
            "total_duration_seconds": total,
            "narrative_arc": "sequence of clips",
            "hook_strategy": "best clip first",
            "pacing": "medium",
            "color_grade_suggestion": "neutral",
            "music_mood": "upbeat",
            "music_bpm_range": [100, 130],
            "clips": clips,
            "audio": {
                "mood": "upbeat",
                "bpm_preference": 120,
                "fade_in_duration": 1.5,
                "fade_out_duration": 2.0,
                "volume": 0.7,
            },
        }
