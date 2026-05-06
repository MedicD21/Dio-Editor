"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { getDownloadUrl } from "../lib/api";

interface Props {
  projectId: string;
  renderDuration?: number | null;
}

export default function ExportPanel({ projectId, renderDuration }: Props) {
  const [copied, setCopied] = useState(false);
  const downloadUrl = getDownloadUrl(projectId);

  const handleDownload = () => {
    window.open(downloadUrl, "_blank");
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "My Dio Editor Video",
          text: "Check out this video I made with Dio Editor",
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // user cancelled share
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full space-y-3"
    >
      {renderDuration && (
        <p className="text-text-muted text-xs text-center">
          Rendered in {Math.round(renderDuration)}s
        </p>
      )}

      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={handleDownload}
        className="btn-gold flex items-center justify-center gap-3 animate-pulse-gold"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M9 2v11M4 9l5 5 5-5M2 16h14" stroke="#080808" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Download Video
      </motion.button>

      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={handleShare}
        className="w-full py-3 px-6 rounded-xl border border-bg-border bg-bg-surface text-text-primary font-medium text-sm flex items-center justify-center gap-2 hover:border-accent-gold/30 transition-colors"
      >
        {copied ? (
          "Link copied!"
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M13 5.5A2.5 2.5 0 1 1 8.5 3M13 10.5A2.5 2.5 0 1 0 8.5 13M5 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            Share
          </>
        )}
      </motion.button>
    </motion.div>
  );
}
