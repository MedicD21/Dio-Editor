import axios from "axios";
import { Job, Project, AudioTrack, UploadResponse, Platform } from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({ baseURL: BASE });

export async function uploadMedia(params: {
  files: File[];
  platform: Platform;
  prompt?: string;
  sessionId?: string;
}): Promise<UploadResponse> {
  const form = new FormData();
  params.files.forEach((f) => form.append("files", f));
  form.append("platform", params.platform);
  if (params.prompt) form.append("prompt", params.prompt);
  if (params.sessionId) form.append("session_id", params.sessionId);

  const resp = await api.post<UploadResponse>("/api/projects/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return resp.data;
}

export async function getProject(id: string): Promise<Project> {
  const resp = await api.get<Project>(`/api/projects/${id}`);
  return resp.data;
}

export async function getJob(id: string): Promise<Job> {
  const resp = await api.get<Job>(`/api/jobs/${id}`);
  return resp.data;
}

export async function searchAudio(mood: string, bpmMin = 60, bpmMax = 160): Promise<AudioTrack[]> {
  const resp = await api.get<AudioTrack[]>("/api/audio/search", {
    params: { mood, bpm_min: bpmMin, bpm_max: bpmMax },
  });
  return resp.data;
}

export async function selectAudio(projectId: string, trackId: string): Promise<void> {
  await api.post("/api/audio/select", { project_id: projectId, track_id: trackId });
}

export function getDownloadUrl(projectId: string): string {
  return `${BASE}/api/projects/${projectId}/download`;
}
