"use client";

import { create } from "zustand";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PipelineStage = "generate" | "compile" | "test" | "complete";

export interface GenerationJob {
  id: string;
  projectId: string;
  projectName: string;
  templateId: string;
  status: "queued" | "running" | "completed" | "failed";
  stage: PipelineStage;
  stageProgress: number; // 0-100 within stage
  overallProgress: number; // 0-100 across all stages
  message: string;
  /** Generated file counts (populated as stages complete) */
  contractFiles: number;
  frontendFiles: number;
  testFiles: number;
  error: string | null;
  createdAt: number;
  completedAt: number | null;
}

interface GenerationState {
  /** Current active job, if any */
  activeJob: GenerationJob | null;
  /** History of completed/failed jobs */
  history: GenerationJob[];

  startJob: (params: {
    projectName: string;
    templateId: string;
  }) => GenerationJob;
  updateProgress: (
    jobId: string,
    patch: Partial<
      Pick<
        GenerationJob,
        | "status"
        | "stage"
        | "stageProgress"
        | "overallProgress"
        | "message"
        | "contractFiles"
        | "frontendFiles"
        | "testFiles"
        | "error"
        | "completedAt"
      >
    >,
  ) => void;
  clearActive: () => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

let jobCounter = 0;

export const useGenerationStore = create<GenerationState>((set, get) => ({
  activeJob: null,
  history: [],

  startJob: ({ projectName, templateId }) => {
    const job: GenerationJob = {
      id: `gen-${Date.now()}-${++jobCounter}`,
      projectId: `proj-${Date.now()}`,
      projectName,
      templateId,
      status: "queued",
      stage: "generate",
      stageProgress: 0,
      overallProgress: 0,
      message: "Queued for generation...",
      contractFiles: 0,
      frontendFiles: 0,
      testFiles: 0,
      error: null,
      createdAt: Date.now(),
      completedAt: null,
    };
    set({ activeJob: job });
    return job;
  },

  updateProgress: (jobId, patch) => {
    const { activeJob } = get();
    if (!activeJob || activeJob.id !== jobId) return;

    const updated = { ...activeJob, ...patch };
    set({ activeJob: updated });

    // Move to history when terminal
    if (updated.status === "completed" || updated.status === "failed") {
      set((s) => ({
        history: [updated, ...s.history].slice(0, 20),
      }));
    }
  },

  clearActive: () => set({ activeJob: null }),
}));
