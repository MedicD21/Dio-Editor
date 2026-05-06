export type Platform = "tiktok" | "reels" | "youtube_shorts" | "twitter" | "linkedin";

export interface MediaFile {
  id: string;
  file: File;
  preview: string;
  type: "photo" | "video";
  name: string;
}

export interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  duration: number;
  bpm: number | null;
  mood: string;
  preview_url: string;
  download_url: string;
  source: string;
}

export interface JobStep {
  name: string;
  status: "pending" | "active" | "complete" | "failed";
  progress: number;
  message: string;
}

export interface Job {
  id: string;
  project_id: string;
  steps: JobStep[];
  output_url: string | null;
  error_message: string | null;
  render_duration_seconds: number | null;
}

export interface Project {
  id: string;
  user_session_id: string;
  status: string;
  platform: Platform;
  user_prompt: string | null;
  asset_count: number;
  created_at: string;
  updated_at: string;
}

export interface UploadResponse {
  project_id: string;
  job_id: string;
  thumbnails: string[];
}

export const PLATFORM_LABELS: Record<Platform, string> = {
  tiktok: "TikTok",
  reels: "Reels",
  youtube_shorts: "YT Shorts",
  twitter: "Twitter",
  linkedin: "LinkedIn",
};

export const PLATFORM_SPECS: Record<Platform, { aspect: string; optimal: string; max: string }> = {
  tiktok:         { aspect: "9:16", optimal: "15s", max: "60s" },
  reels:          { aspect: "9:16", optimal: "30s", max: "90s" },
  youtube_shorts: { aspect: "9:16", optimal: "45s", max: "60s" },
  twitter:        { aspect: "16:9", optimal: "45s", max: "2:20" },
  linkedin:       { aspect: "16:9", optimal: "60s", max: "10m" },
};
