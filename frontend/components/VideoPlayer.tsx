"use client";
import React, { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";

interface Props {
  src: string;
}

export default function VideoPlayer({ src }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(false);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  }, []);

  const onTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    setProgress((v.currentTime / v.duration) * 100);
  }, []);

  const onSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    v.currentTime = pct * v.duration;
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative w-full bg-black rounded-2xl overflow-hidden"
      style={{ aspectRatio: "9/16", maxHeight: 540 }}
    >
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-contain"
        onTimeUpdate={onTimeUpdate}
        onEnded={() => setPlaying(false)}
        playsInline
        muted={muted}
        preload="metadata"
      />

      <div
        className="absolute inset-0 flex items-center justify-center cursor-pointer"
        onClick={togglePlay}
      >
        {!playing && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center"
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="white">
              <polygon points="6,2 20,11 6,20" />
            </svg>
          </motion.div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-12 bg-gradient-to-t from-black/80 to-transparent">
        <div
          className="w-full h-1 bg-white/20 rounded-full cursor-pointer"
          onClick={onSeek}
        >
          <div
            className="h-full bg-accent-gold rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between mt-3">
          <button
            onClick={togglePlay}
            className="text-white text-sm font-medium"
          >
            {playing ? "⏸" : "▶"}
          </button>
          <button
            onClick={() => setMuted((m) => !m)}
            className="text-white text-sm"
          >
            {muted ? "🔇" : "🔊"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
