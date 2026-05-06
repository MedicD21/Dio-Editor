"use client";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import UploadZone from "../components/UploadZone";
import MediaGrid from "../components/MediaGrid";
import PromptInput from "../components/PromptInput";
import PlatformSelector from "../components/PlatformSelector";
import ProcessingModeSelector from "../components/ProcessingModeSelector";
import AudioPicker from "../components/AudioPicker";
import { useAppStore } from "../lib/store";
import { uploadMedia } from "../lib/api";

const stagger = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", damping: 22, stiffness: 200 } },
};

export default function HomePage() {
  const router = useRouter();
  const {
    sessionId, setSessionId,
    mediaFiles, platform, processingMode, prompt, audioMode, selectedTrack, clearAll,
  } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      const stored = localStorage.getItem("dio_session_id") || uuidv4();
      localStorage.setItem("dio_session_id", stored);
      setSessionId(stored);
    }
  }, [sessionId, setSessionId]);

  const canSubmit = mediaFiles.length > 0 && !loading;

  const handleCreate = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await uploadMedia({
        files: mediaFiles.map((m) => m.file),
        platform,
        processingMode,
        prompt: prompt || undefined,
        sessionId,
      });
      clearAll();
      router.push(`/projects/${resp.project_id}?job=${resp.job_id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed. Please try again.";
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <header className="sticky top-0 z-50 bg-bg-primary/90 backdrop-blur-sm border-b border-bg-border px-4 py-4 flex items-center justify-between">
        <motion.h1
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          className="font-display text-3xl text-accent-gold tracking-wider"
        >
          DIO EDITOR
        </motion.h1>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-2"
        >
          <div className="w-2 h-2 rounded-full bg-accent-gold animate-pulse" />
          <span className="text-text-muted text-xs">AI Ready</span>
        </motion.div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          <motion.div variants={fadeUp}>
            <UploadZone />
          </motion.div>

          <motion.div variants={fadeUp}>
            <MediaGrid />
          </motion.div>

          <motion.div variants={fadeUp}>
            <PromptInput />
          </motion.div>

          <motion.div variants={fadeUp}>
            <PlatformSelector />
          </motion.div>

          <motion.div variants={fadeUp}>
            <ProcessingModeSelector />
          </motion.div>

          <motion.div variants={fadeUp}>
            <AudioPicker />
          </motion.div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl border border-red-800 bg-red-900/10"
            >
              <p className="text-red-400 text-sm">{error}</p>
            </motion.div>
          )}

          <motion.div variants={fadeUp} className="pb-8">
            <motion.button
              onClick={handleCreate}
              disabled={!canSubmit}
              whileTap={canSubmit ? { scale: 0.98 } : {}}
              animate={
                canSubmit && !loading
                  ? { boxShadow: ["0 0 20px rgba(232,197,71,0.15)", "0 0 40px rgba(232,197,71,0.4)", "0 0 20px rgba(232,197,71,0.15)"] }
                  : {}
              }
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="btn-gold flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 rounded-full border-2 border-bg-primary border-t-transparent animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  CREATE VIDEO
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M3 9h12M10 4l5 5-5 5" stroke="#080808" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </>
              )}
            </motion.button>

            {!canSubmit && !loading && (
              <p className="text-text-muted text-xs text-center mt-2">
                Upload at least one photo or video to continue
              </p>
            )}
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
