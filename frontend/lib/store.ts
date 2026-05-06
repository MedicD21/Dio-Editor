import { create } from "zustand";
import { MediaFile, Platform, AudioTrack } from "./types";

interface AppState {
  sessionId: string;
  mediaFiles: MediaFile[];
  platform: Platform;
  prompt: string;
  audioMode: "auto" | "pick";
  selectedTrack: AudioTrack | null;
  setSessionId: (id: string) => void;
  addMediaFiles: (files: MediaFile[]) => void;
  removeMediaFile: (id: string) => void;
  reorderMedia: (from: number, to: number) => void;
  setPlatform: (p: Platform) => void;
  setPrompt: (s: string) => void;
  setAudioMode: (m: "auto" | "pick") => void;
  setSelectedTrack: (t: AudioTrack | null) => void;
  clearAll: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  sessionId: "",
  mediaFiles: [],
  platform: "tiktok",
  prompt: "",
  audioMode: "auto",
  selectedTrack: null,

  setSessionId: (id) => set({ sessionId: id }),
  addMediaFiles: (files) =>
    set((s) => ({
      mediaFiles: [
        ...s.mediaFiles,
        ...files.filter(
          (f) => !s.mediaFiles.find((m) => m.name === f.name && m.file.size === f.file.size)
        ),
      ].slice(0, 30),
    })),
  removeMediaFile: (id) =>
    set((s) => ({ mediaFiles: s.mediaFiles.filter((m) => m.id !== id) })),
  reorderMedia: (from, to) =>
    set((s) => {
      const arr = [...s.mediaFiles];
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      return { mediaFiles: arr };
    }),
  setPlatform: (p) => set({ platform: p }),
  setPrompt: (prompt) => set({ prompt }),
  setAudioMode: (audioMode) => set({ audioMode }),
  setSelectedTrack: (selectedTrack) => set({ selectedTrack }),
  clearAll: () =>
    set({
      mediaFiles: [],
      prompt: "",
      audioMode: "auto",
      selectedTrack: null,
    }),
}));
