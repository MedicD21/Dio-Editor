"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { JobStep } from "../lib/types";

interface Props {
  steps: JobStep[];
  errorMessage?: string | null;
}

const STEP_ICONS: Record<string, string> = {
  "Downloading assets": "↓",
  "Analyzing media": "◎",
  "Planning edit": "✦",
  "Selecting audio": "♪",
  "Beat detection": "≋",
  "Processing clips": "⚙",
  "Compositing": "▦",
  "Finalizing": "✓",
  "Uploading": "↑",
  "Complete": "★",
};

export default function JobProgress({ steps, errorMessage }: Props) {
  return (
    <div className="w-full space-y-3">
      <AnimatePresence>
        {steps.map((step, i) => {
          const isActive = step.status === "active";
          const isDone = step.status === "complete";
          const isFailed = step.status === "failed";
          const isPending = step.status === "pending";

          return (
            <motion.div
              key={step.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: isActive || isDone || isFailed ? 1 : 0.45, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`flex items-start gap-4 p-3 rounded-xl border transition-all ${
                isActive
                  ? "border-accent-gold bg-accent-gold/5"
                  : isDone
                  ? "border-bg-border bg-bg-surface"
                  : isFailed
                  ? "border-red-800 bg-red-900/10"
                  : "border-bg-border bg-bg-surface"
              }`}
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center">
                {isActive ? (
                  <div className="w-6 h-6 rounded-full border-2 border-accent-gold border-t-transparent animate-spin" />
                ) : isDone ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-6 h-6 rounded-full bg-accent-gold/20 border border-accent-gold flex items-center justify-center"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <polyline points="1.5,5 3.5,7.5 8.5,2.5" stroke="#E8C547" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </motion.div>
                ) : isFailed ? (
                  <div className="w-6 h-6 rounded-full bg-red-900/30 border border-red-700 flex items-center justify-center">
                    <span className="text-red-400 text-xs">✗</span>
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full border border-bg-border flex items-center justify-center">
                    <span className="text-text-muted text-xs">{STEP_ICONS[step.name] || i + 1}</span>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-sm font-medium ${
                      isActive ? "text-accent-gold" : isDone ? "text-text-primary" : "text-text-muted"
                    }`}
                  >
                    {step.name}
                  </span>
                  {isActive && step.progress > 0 && (
                    <span className="text-xs text-accent-gold">{step.progress}%</span>
                  )}
                </div>

                {step.message && (isActive || isDone || isFailed) && (
                  <p className={`text-xs mt-0.5 truncate ${isFailed ? "text-red-400" : "text-text-muted"}`}>
                    {step.message}
                  </p>
                )}

                {isActive && step.progress > 0 && (
                  <div className="mt-2 h-1 w-full bg-bg-border rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${step.progress}%` }}
                      className="h-full bg-accent-gold rounded-full"
                      transition={{ ease: "easeOut" }}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl border border-red-800 bg-red-900/10"
        >
          <p className="text-red-400 text-sm font-medium">Processing failed</p>
          <p className="text-red-400/70 text-xs mt-1">{errorMessage}</p>
        </motion.div>
      )}
    </div>
  );
}
