"use client";
import React from "react";
import { motion } from "framer-motion";
import { Platform, PLATFORM_LABELS, PLATFORM_SPECS } from "../lib/types";
import { useAppStore } from "../lib/store";

const PLATFORMS: Platform[] = ["tiktok", "reels", "youtube_shorts", "twitter", "linkedin"];

const PLATFORM_ICONS: Record<Platform, string> = {
  tiktok: "T",
  reels: "R",
  youtube_shorts: "YT",
  twitter: "X",
  linkedin: "in",
};

export default function PlatformSelector() {
  const platform = useAppStore((s) => s.platform);
  const setPlatform = useAppStore((s) => s.setPlatform);

  return (
    <div className="w-full">
      <label className="text-text-muted text-xs uppercase tracking-widest mb-3 block font-medium">
        Platform
      </label>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 snap-x snap-mandatory">
        {PLATFORMS.map((p) => {
          const active = platform === p;
          const specs = PLATFORM_SPECS[p];
          return (
            <motion.button
              key={p}
              onClick={() => setPlatform(p)}
              whileTap={{ scale: 0.95 }}
              className="flex-shrink-0 snap-start"
            >
              <motion.div
                animate={
                  active
                    ? { borderColor: "#E8C547", backgroundColor: "rgba(232, 197, 71, 0.08)" }
                    : { borderColor: "#2A2A2A", backgroundColor: "#111111" }
                }
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center gap-1 px-4 py-3 rounded-xl border min-w-[80px] cursor-pointer"
              >
                <span
                  className={`text-xs font-bold tracking-wider ${
                    active ? "text-accent-gold" : "text-text-muted"
                  }`}
                  style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16 }}
                >
                  {PLATFORM_ICONS[p]}
                </span>
                <span
                  className={`text-xs font-medium whitespace-nowrap ${
                    active ? "text-accent-gold" : "text-text-muted"
                  }`}
                >
                  {PLATFORM_LABELS[p]}
                </span>
                <span className="text-[10px] text-text-muted">{specs.aspect}</span>
              </motion.div>
            </motion.button>
          );
        })}
      </div>
      <div className="mt-2 flex gap-4 text-xs text-text-muted">
        <span>Optimal: {PLATFORM_SPECS[platform].optimal}</span>
        <span>Max: {PLATFORM_SPECS[platform].max}</span>
      </div>
    </div>
  );
}
