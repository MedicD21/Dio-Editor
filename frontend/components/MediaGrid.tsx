"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "../lib/store";

export default function MediaGrid() {
  const mediaFiles = useAppStore((s) => s.mediaFiles);
  const removeMediaFile = useAppStore((s) => s.removeMediaFile);

  if (mediaFiles.length === 0) return null;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <span className="text-text-muted text-sm">
          {mediaFiles.length} file{mediaFiles.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={() => mediaFiles.forEach((m) => removeMediaFile(m.id))}
          className="text-text-muted text-sm hover:text-text-primary transition-colors"
        >
          Clear all
        </button>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
        <AnimatePresence>
          {mediaFiles.map((media, i) => (
            <motion.div
              key={media.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 25 }}
              className="relative aspect-square rounded-xl overflow-hidden group cursor-pointer bg-bg-elevated border border-bg-border"
            >
              {media.type === "video" ? (
                <video
                  src={media.preview}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                  preload="metadata"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={media.preview}
                  alt={media.name}
                  className="w-full h-full object-cover"
                />
              )}

              {media.type === "video" && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="white">
                      <polygon points="3,1 13,7 3,13" />
                    </svg>
                  </div>
                </div>
              )}

              <motion.button
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                onClick={(e) => {
                  e.stopPropagation();
                  removeMediaFile(media.id);
                }}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="white">
                  <path d="M1 1l8 8M9 1L1 9" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </motion.button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
