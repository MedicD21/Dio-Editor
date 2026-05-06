"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "../lib/store";
import { searchAudio } from "../lib/api";
import { AudioTrack } from "../lib/types";

export default function AudioPicker() {
  const audioMode = useAppStore((s) => s.audioMode);
  const setAudioMode = useAppStore((s) => s.setAudioMode);
  const selectedTrack = useAppStore((s) => s.selectedTrack);
  const setSelectedTrack = useAppStore((s) => s.setSelectedTrack);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  React.useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const { data: tracks = [], isLoading } = useQuery({
    queryKey: ["audio", "upbeat"],
    queryFn: () => searchAudio("upbeat"),
    enabled: audioMode === "pick",
    staleTime: 60000,
  });

  const handlePlay = (track: AudioTrack) => {
    if (playingId === track.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(track.preview_url);
    audio.volume = 0.5;
    audio.play().catch(() => {});
    audio.onended = () => setPlayingId(null);
    audioRef.current = audio;
    setPlayingId(track.id);
  };

  return (
    <div className="w-full">
      <label className="text-text-muted text-xs uppercase tracking-widest mb-3 block font-medium">
        Audio
      </label>

      <div className="flex gap-2 mb-3">
        {(["auto", "pick"] as const).map((mode) => (
          <motion.button
            key={mode}
            onClick={() => setAudioMode(mode)}
            whileTap={{ scale: 0.96 }}
            animate={
              audioMode === mode
                ? { borderColor: "#E8C547", background: "rgba(232, 197, 71, 0.08)" }
                : { borderColor: "#2A2A2A", background: "#111111" }
            }
            className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors"
          >
            <span className={audioMode === mode ? "text-accent-gold" : "text-text-muted"}>
              {mode === "auto" ? "Auto ✓" : "Pick Track"}
            </span>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {audioMode === "pick" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            {isLoading ? (
              <div className="flex items-center gap-3 p-4 card">
                <div className="w-8 h-8 rounded-full border-2 border-accent-gold border-t-transparent animate-spin" />
                <span className="text-text-muted text-sm">Loading tracks...</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-hide">
                {tracks.map((track) => {
                  const isSelected = selectedTrack?.id === track.id;
                  const isPlaying = playingId === track.id;
                  return (
                    <motion.div
                      key={track.id}
                      whileTap={{ scale: 0.98 }}
                      animate={
                        isSelected
                          ? { borderColor: "#E8C547", background: "rgba(232, 197, 71, 0.05)" }
                          : { borderColor: "#2A2A2A", background: "#111111" }
                      }
                      className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer"
                      onClick={() => setSelectedTrack(isSelected ? null : track)}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlay(track);
                        }}
                        className="w-9 h-9 rounded-full bg-bg-elevated border border-bg-border flex items-center justify-center flex-shrink-0 hover:border-accent-gold transition-colors"
                      >
                        {isPlaying ? (
                          <span className="w-3 h-3 flex gap-0.5">
                            <span className="w-1 bg-accent-gold rounded-sm animate-pulse" />
                            <span className="w-1 bg-accent-gold rounded-sm animate-pulse delay-75" />
                            <span className="w-1 bg-accent-gold rounded-sm animate-pulse delay-150" />
                          </span>
                        ) : (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="white">
                            <polygon points="2,1 11,6 2,11" />
                          </svg>
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isSelected ? "text-accent-gold" : "text-text-primary"}`}>
                          {track.title}
                        </p>
                        <p className="text-xs text-text-muted truncate">
                          {track.artist}
                          {track.bpm ? ` · ${Math.round(track.bpm)} BPM` : ""}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-text-muted">{Math.round(track.duration)}s</span>
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-accent-gold flex items-center justify-center">
                            <svg width="8" height="8" viewBox="0 0 8 8" fill="#080808">
                              <polyline points="1,4 3,6 7,2" strokeWidth="1.5" stroke="#080808" fill="none" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {audioMode === "auto" && (
        <p className="text-text-muted text-xs">
          AI will select the best matching track from our music library
        </p>
      )}
    </div>
  );
}
