"use client";
import React, { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getJob, getProject } from "../../../lib/api";
import JobProgress from "../../../components/JobProgress";
import VideoPlayer from "../../../components/VideoPlayer";
import ExportPanel from "../../../components/ExportPanel";
import { Job, Project } from "../../../lib/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default function ProjectPage({ params }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = searchParams.get("job");
  const { id: projectId } = React.use(params);
  const [showRerender, setShowRerender] = useState(false);
  const [newPrompt, setNewPrompt] = useState("");

  const { data: project } = useQuery<Project>({
    queryKey: ["project", projectId],
    queryFn: () => getProject(projectId),
    refetchInterval: (query) =>
      query.state.data &&
      ["complete", "failed"].includes(query.state.data.status)
        ? false
        : 3000,
  });

  const { data: job } = useQuery<Job>({
    queryKey: ["job", jobId],
    queryFn: () => getJob(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) =>
      query.state.data && query.state.data.output_url ? false : 2000,
  });

  const isComplete = project?.status === "complete";
  const isFailed = project?.status === "failed";
  const steps = job?.steps || [];

  const getOverallProgress = useCallback(() => {
    if (!steps.length) return 0;
    const done = steps.filter((s) => s.status === "complete").length;
    const active = steps.find((s) => s.status === "active");
    const activeProgress = active ? active.progress / 100 : 0;
    return Math.round(((done + activeProgress) / steps.length) * 100);
  }, [steps]);

  const statusLabel = isComplete
    ? "Complete"
    : isFailed
      ? "Failed"
      : "Processing...";

  return (
    <div className='min-h-screen bg-bg-primary flex flex-col'>
      <header className='sticky top-0 z-50 bg-bg-primary/90 backdrop-blur-sm border-b border-bg-border px-4 py-4 flex items-center gap-4'>
        <button
          onClick={() => router.push("/")}
          className='flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors'
        >
          <svg width='16' height='16' viewBox='0 0 16 16' fill='none'>
            <path
              d='M10 2L4 8l6 6'
              stroke='currentColor'
              strokeWidth='1.5'
              strokeLinecap='round'
              strokeLinejoin='round'
            />
          </svg>
          <span className='text-sm'>Back</span>
        </button>
        <h1 className='font-display text-2xl text-accent-gold tracking-wider flex-1'>
          DIO EDITOR
        </h1>
        <div className='flex items-center gap-2'>
          <div
            className={`w-2 h-2 rounded-full ${
              isComplete
                ? "bg-green-400"
                : isFailed
                  ? "bg-red-400"
                  : "bg-accent-gold animate-pulse"
            }`}
          />
          <span className='text-text-muted text-xs'>{statusLabel}</span>
        </div>
      </header>

      <main className='flex-1 max-w-lg mx-auto w-full px-4 py-6'>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className='space-y-6'
        >
          {!isComplete && !isFailed && (
            <div className='card p-4'>
              <div className='flex items-center justify-between mb-3'>
                <h2 className='text-text-primary font-medium text-sm'>
                  Processing your video
                </h2>
                <span className='text-accent-gold text-sm font-medium'>
                  {getOverallProgress()}%
                </span>
              </div>
              <div className='h-1.5 w-full bg-bg-border rounded-full overflow-hidden mb-4'>
                <motion.div
                  animate={{ width: `${getOverallProgress()}%` }}
                  transition={{ ease: "easeOut", duration: 0.5 }}
                  className='h-full bg-accent-gold rounded-full'
                />
              </div>
            </div>
          )}

          <JobProgress steps={steps} errorMessage={job?.error_message} />

          {isComplete && job?.output_url && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className='space-y-6'
            >
              <div className='flex items-center gap-3'>
                <div className='w-8 h-8 rounded-full bg-accent-gold/20 border border-accent-gold flex items-center justify-center'>
                  <svg width='14' height='14' viewBox='0 0 14 14' fill='none'>
                    <polyline
                      points='2,7 5,10 12,3'
                      stroke='#E8C547'
                      strokeWidth='2'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    />
                  </svg>
                </div>
                <h2 className='text-text-primary font-semibold'>
                  Your video is ready!
                </h2>
              </div>

              <VideoPlayer src={job.output_url} />
              <ExportPanel
                projectId={projectId}
                renderDuration={job.render_duration_seconds}
              />

              <button
                onClick={() => setShowRerender((v) => !v)}
                className='w-full py-3 px-4 rounded-xl border border-bg-border bg-bg-surface text-text-muted text-sm flex items-center justify-center gap-2 hover:border-accent-gold/30 hover:text-text-primary transition-colors'
              >
                <svg width='14' height='14' viewBox='0 0 14 14' fill='none'>
                  <path
                    d='M1 7a6 6 0 1 1 6 6'
                    stroke='currentColor'
                    strokeWidth='1.5'
                    strokeLinecap='round'
                  />
                  <polyline
                    points='1,4 1,7 4,7'
                    stroke='currentColor'
                    strokeWidth='1.5'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                </svg>
                Re-render with new prompt
              </button>

              {showRerender && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className='space-y-3'
                >
                  <textarea
                    value={newPrompt}
                    onChange={(e) => setNewPrompt(e.target.value)}
                    placeholder='Describe changes for the new render...'
                    rows={3}
                    className='w-full bg-bg-elevated text-text-primary placeholder-text-muted resize-none outline-none rounded-xl border border-bg-border px-4 py-3 text-sm'
                  />
                  <button
                    onClick={() => router.push("/")}
                    className='btn-gold text-sm py-3'
                  >
                    Start New Video
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}

          {isFailed && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className='space-y-4'
            >
              <button onClick={() => router.push("/")} className='btn-gold'>
                Try Again
              </button>
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
