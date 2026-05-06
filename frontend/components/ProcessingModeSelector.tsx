"use client";
import React from "react";
import { motion } from "framer-motion";
import { useAppStore } from "../lib/store";

const MODES = [
  {
    id: "fast" as const,
    label: "Fast",
    hint: "Quick draft",
  },
  {
    id: "pro_ai" as const,
    label: "Pro AI",
    hint: "Full analysis",
  },
];

export default function ProcessingModeSelector() {
  const processingMode = useAppStore((s) => s.processingMode);
  const setProcessingMode = useAppStore((s) => s.setProcessingMode);

  return (
    <div className="w-full">
      <label className="text-text-muted text-xs uppercase tracking-widest mb-3 block font-medium">
        Mode
      </label>
      <div className="grid grid-cols-2 gap-2">
        {MODES.map((mode) => {
          const active = processingMode === mode.id;
          return (
            <motion.button
              key={mode.id}
              onClick={() => setProcessingMode(mode.id)}
              whileTap={{ scale: 0.98 }}
              animate={
                active
                  ? { borderColor: "#E8C547", background: "rgba(232, 197, 71, 0.08)" }
                  : { borderColor: "#2A2A2A", background: "#111111" }
              }
              className="rounded-xl border px-4 py-3 text-left"
            >
              <div className={`text-sm font-medium ${active ? "text-accent-gold" : "text-text-primary"}`}>
                {mode.label}
              </div>
              <div className="text-xs text-text-muted mt-0.5">{mode.hint}</div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
