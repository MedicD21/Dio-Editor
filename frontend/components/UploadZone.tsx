"use client";
import React, { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { v4 as uuidv4 } from "uuid";
import { useAppStore } from "../lib/store";
import { MediaFile } from "../lib/types";

const ACCEPTED = "image/jpeg,image/png,image/gif,image/webp,image/heic,video/mp4,video/quicktime,video/webm,video/x-m4v";

function fileToMediaFile(file: File): MediaFile {
  return {
    id: uuidv4(),
    file,
    preview: URL.createObjectURL(file),
    type: file.type.startsWith("video") ? "video" : "photo",
    name: file.name,
  };
}

export default function UploadZone() {
  const addMediaFiles = useAppStore((s) => s.addMediaFiles);
  const mediaFiles = useAppStore((s) => s.mediaFiles);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(
    (files: FileList | File[]) => {
      const arr = Array.from(files).filter((f) => {
        const t = f.type;
        return t.startsWith("image/") || t.startsWith("video/");
      });
      addMediaFiles(arr.map(fileToMediaFile));
    },
    [addMediaFiles]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      processFiles(e.dataTransfer.files);
    },
    [processFiles]
  );

  const onTap = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) processFiles(e.target.files);
      e.target.value = "";
    },
    [processFiles]
  );

  return (
    <div className="w-full">
      <motion.div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={onTap}
        onTouchEnd={onTap}
        animate={isDragging ? { scale: 1.02 } : { scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className={`
          relative w-full min-h-[180px] flex flex-col items-center justify-center
          rounded-2xl cursor-pointer select-none
          border-2 border-dashed transition-all duration-200
          ${isDragging
            ? "border-accent-gold bg-accent-gold/5 shadow-gold-lg"
            : "border-bg-border hover:border-accent-gold/50 hover:bg-white/[0.02]"
          }
        `}
        style={{
          boxShadow: isDragging ? "0 0 40px rgba(232, 197, 71, 0.25)" : undefined,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          multiple
          onChange={onInputChange}
          style={{ display: "none" }}
        />

        <AnimatePresence>
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-3 py-8 px-6 text-center"
          >
            <motion.div
              animate={isDragging ? { scale: 1.2, rotate: 5 } : { scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="w-16 h-16 rounded-full bg-bg-elevated border border-bg-border flex items-center justify-center"
              style={{
                background: isDragging
                  ? "rgba(232, 197, 71, 0.12)"
                  : undefined,
                borderColor: isDragging ? "rgba(232, 197, 71, 0.5)" : undefined,
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 5v14M5 12l7-7 7 7"
                  stroke={isDragging ? "#E8C547" : "#888"}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </motion.div>

            <div>
              <p className="text-text-primary font-medium text-base">
                {isDragging ? "Drop your media here" : "Tap to upload media"}
              </p>
              <p className="text-text-muted text-sm mt-1">
                {mediaFiles.length > 0
                  ? `${mediaFiles.length} file${mediaFiles.length !== 1 ? "s" : ""} selected — tap to add more`
                  : "Photos & videos — up to 30 files"}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
