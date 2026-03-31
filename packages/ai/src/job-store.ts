// ---------------------------------------------------------------------------
// In-memory job store — MVP replacement for BullMQ + Redis
// ---------------------------------------------------------------------------

import type { PipelineResult } from "./orchestrator";

export interface Job {
  id: string;
  projectId: string;
  status: "queued" | "running" | "completed" | "failed";
  progress: number;
  currentStage: string | null;
  result: PipelineResult | null;
  error: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

type JobListener = (job: Job) => void;

class JobStore {
  private jobs = new Map<string, Job>();
  private listeners = new Map<string, Set<JobListener>>();

  /** Create a new job in "queued" status and return it. */
  createJob(projectId: string): Job {
    const job: Job = {
      id: crypto.randomUUID(),
      projectId,
      status: "queued",
      progress: 0,
      currentStage: null,
      result: null,
      error: null,
      createdAt: new Date(),
      completedAt: null,
    };
    this.jobs.set(job.id, job);
    return job;
  }

  /** Retrieve a job by ID, or undefined if it doesn't exist. */
  getJob(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  /** Apply a partial update to a job and notify all subscribers. */
  updateJob(id: string, patch: Partial<Job>): void {
    const existing = this.jobs.get(id);
    if (!existing) {
      throw new Error(`Job not found: ${id}`);
    }

    const updated: Job = { ...existing, ...patch };
    this.jobs.set(id, updated);

    // Notify listeners
    const subs = this.listeners.get(id);
    if (subs) {
      for (const listener of subs) {
        try {
          listener(updated);
        } catch {
          // Swallow listener errors so one bad subscriber doesn't break others.
        }
      }
    }
  }

  /**
   * Subscribe to updates for a specific job.
   * Returns an unsubscribe function.
   */
  subscribe(jobId: string, listener: JobListener): () => void {
    let subs = this.listeners.get(jobId);
    if (!subs) {
      subs = new Set();
      this.listeners.set(jobId, subs);
    }
    subs.add(listener);

    return () => {
      subs!.delete(listener);
      if (subs!.size === 0) {
        this.listeners.delete(jobId);
      }
    };
  }
}

/** Singleton job store shared across the application. */
export const jobStore = new JobStore();
