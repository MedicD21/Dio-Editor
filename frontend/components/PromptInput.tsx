"use client";
import React from "react";
import { motion } from "framer-motion";
import { useAppStore } from "../lib/store";

const PLACEHOLDERS = [
  "Make it cinematic with a dramatic feel...",
  "Fast-paced energy, perfect for TikTok...",
  "Warm summer vibes, tell a story...",
  "Minimal and elegant, slow burn...",
  "High energy with bold text overlays...",
];

export default function PromptInput() {
  const prompt = useAppStore((s) => s.prompt);
  const setPrompt = useAppStore((s) => s.setPrompt);
  const [focused, setFocused] = React.useState(false);
  const placeholder = PLACEHOLDERS[0];

  return (
    <div className="w-full">
      <label className="text-text-muted text-xs uppercase tracking-widest mb-2 block font-medium">
        Creative direction (optional)
      </label>
      <motion.div
        animate={
          focused
            ? { boxShadow: "0 0 0 1px rgba(232, 197, 71, 0.5), 0 0 20px rgba(232, 197, 71, 0.08)" }
            : { boxShadow: "0 0 0 1px #2A2A2A" }
        }
        className="rounded-xl overflow-hidden"
      >
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          rows={3}
          maxLength={500}
          className="
            w-full bg-bg-elevated text-text-primary placeholder-text-muted
            resize-none outline-none border-none
            px-4 py-3 text-sm leading-relaxed
            transition-colors duration-200
          "
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        />
      </motion.div>
      <div className="flex justify-end mt-1">
        <span className="text-text-muted text-xs">{prompt.length}/500</span>
      </div>
    </div>
  );
}
