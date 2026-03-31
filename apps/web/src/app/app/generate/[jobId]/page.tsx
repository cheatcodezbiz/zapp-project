"use client";

import { useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useGenerationStore,
  type PipelineStage,
} from "@/stores/generation-store";

// ---------------------------------------------------------------------------
// Stage metadata
// ---------------------------------------------------------------------------

const STAGES: {
  key: PipelineStage;
  label: string;
  icon: string;
  description: string;
}[] = [
  {
    key: "generate",
    label: "Generate Code",
    icon: "\u{1F9E0}",
    description: "AI is writing your smart contracts and frontend",
  },
  {
    key: "compile",
    label: "Compile",
    icon: "\u{2699}\u{FE0F}",
    description: "Compiling Solidity contracts with Hardhat",
  },
  {
    key: "test",
    label: "Run Tests",
    icon: "\u{1F9EA}",
    description: "Running automated test suite",
  },
  {
    key: "complete",
    label: "Complete",
    icon: "\u{2705}",
    description: "Your dApp is ready!",
  },
];

function getStageIndex(stage: PipelineStage): number {
  return STAGES.findIndex((s) => s.key === stage);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function GenerationProgressPage() {
  const params = useParams<{ jobId: string }>();
  const router = useRouter();
  const job = useGenerationStore((s) => s.activeJob);
  const updateProgress = useGenerationStore((s) => s.updateProgress);
  const simulationStarted = useRef(false);

  // ── Simulate pipeline progress for MVP ───────────────────────────────
  const simulatePipeline = useCallback(
    (jobId: string) => {
      const steps: Array<{
        delay: number;
        patch: Parameters<typeof updateProgress>[1];
      }> = [
        // Generate stage
        {
          delay: 300,
          patch: {
            status: "running",
            stage: "generate",
            stageProgress: 0,
            overallProgress: 5,
            message: "Analyzing template parameters...",
          },
        },
        {
          delay: 1200,
          patch: {
            stage: "generate",
            stageProgress: 25,
            overallProgress: 12,
            message: "Generating smart contract code...",
          },
        },
        {
          delay: 2000,
          patch: {
            stage: "generate",
            stageProgress: 50,
            overallProgress: 25,
            message: "Writing UUPS upgradeable contract...",
            contractFiles: 1,
          },
        },
        {
          delay: 1500,
          patch: {
            stage: "generate",
            stageProgress: 75,
            overallProgress: 35,
            message: "Generating frontend components...",
            contractFiles: 2,
          },
        },
        {
          delay: 1800,
          patch: {
            stage: "generate",
            stageProgress: 100,
            overallProgress: 50,
            message: "Code generation complete",
            contractFiles: 2,
            frontendFiles: 4,
          },
        },
        // Compile stage
        {
          delay: 800,
          patch: {
            stage: "compile",
            stageProgress: 0,
            overallProgress: 52,
            message: "Starting Hardhat compilation...",
          },
        },
        {
          delay: 1500,
          patch: {
            stage: "compile",
            stageProgress: 50,
            overallProgress: 65,
            message: "Compiling Solidity 0.8.28 with optimizer...",
          },
        },
        {
          delay: 1200,
          patch: {
            stage: "compile",
            stageProgress: 100,
            overallProgress: 80,
            message: "Compilation succeeded — 0 warnings",
          },
        },
        // Test stage
        {
          delay: 600,
          patch: {
            stage: "test",
            stageProgress: 0,
            overallProgress: 82,
            message: "Deploying contracts to local testnet...",
            testFiles: 1,
          },
        },
        {
          delay: 1500,
          patch: {
            stage: "test",
            stageProgress: 50,
            overallProgress: 90,
            message: "Running 12 test cases...",
          },
        },
        {
          delay: 1200,
          patch: {
            stage: "test",
            stageProgress: 100,
            overallProgress: 98,
            message: "All 12 tests passed",
          },
        },
        // Complete
        {
          delay: 500,
          patch: {
            status: "completed",
            stage: "complete",
            stageProgress: 100,
            overallProgress: 100,
            message: "Your dApp is ready!",
            completedAt: Date.now(),
          },
        },
      ];

      let accumulated = 0;
      const timers: ReturnType<typeof setTimeout>[] = [];
      for (const step of steps) {
        accumulated += step.delay;
        timers.push(
          setTimeout(() => {
            updateProgress(jobId, step.patch);
          }, accumulated),
        );
      }

      return () => timers.forEach(clearTimeout);
    },
    [updateProgress],
  );

  useEffect(() => {
    if (!job || job.id !== params.jobId) return;
    if (simulationStarted.current) return;
    if (job.status === "queued") {
      simulationStarted.current = true;
      const cleanup = simulatePipeline(job.id);
      return cleanup;
    }
  }, [job, params.jobId, simulatePipeline]);

  // ── No job found ─────────────────────────────────────────────────────
  if (!job || job.id !== params.jobId) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg font-medium text-foreground">Job not found</p>
        <p className="mt-2 text-sm text-muted-foreground">
          This generation job doesn&apos;t exist or has expired.
        </p>
        <a
          href="/app/templates"
          className="mt-6 inline-flex h-10 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Back to Templates
        </a>
      </div>
    );
  }

  const currentStageIdx = getStageIndex(job.stage);
  const isComplete = job.status === "completed";
  const isFailed = job.status === "failed";

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {isComplete
            ? "Generation Complete!"
            : isFailed
              ? "Generation Failed"
              : "Generating Your dApp"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {job.projectName}
        </p>
      </div>

      {/* Overall progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Overall Progress</span>
          <span className="font-medium tabular-nums text-foreground">
            {job.overallProgress}%
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-surface-container">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${
              isFailed ? "bg-red-500" : isComplete ? "bg-green-500" : "bg-primary"
            }`}
            style={{ width: `${job.overallProgress}%` }}
          />
        </div>
        <p className="text-sm text-muted-foreground">{job.message}</p>
      </div>

      {/* Stage timeline */}
      <div className="space-y-4">
        {STAGES.map((stage, idx) => {
          const isPast = idx < currentStageIdx;
          const isCurrent = idx === currentStageIdx;
          const isFuture = idx > currentStageIdx;

          return (
            <div
              key={stage.key}
              className={`flex items-start gap-4 rounded-lg border p-4 transition-colors ${
                isCurrent
                  ? "border-primary/50 bg-primary/5"
                  : isPast
                    ? "border-border bg-card"
                    : "border-border/50 bg-card/50 opacity-50"
              }`}
            >
              {/* Stage icon */}
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${
                  isPast
                    ? "bg-green-500/10"
                    : isCurrent
                      ? "bg-primary/10"
                      : "bg-surface-container"
                }`}
              >
                {isPast ? "\u2705" : stage.icon}
              </div>

              {/* Stage info */}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3
                    className={`text-sm font-semibold ${
                      isFuture
                        ? "text-muted-foreground"
                        : "text-foreground"
                    }`}
                  >
                    {stage.label}
                  </h3>
                  {isCurrent && !isComplete && !isFailed && (
                    <span className="text-xs tabular-nums text-primary">
                      {job.stageProgress}%
                    </span>
                  )}
                  {isPast && (
                    <span className="text-xs text-green-400">Done</span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {stage.description}
                </p>

                {/* Stage progress bar */}
                {isCurrent && !isComplete && !isFailed && (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-container">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${job.stageProgress}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Generated file counts */}
      {(job.contractFiles > 0 ||
        job.frontendFiles > 0 ||
        job.testFiles > 0) && (
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-2xl font-bold text-foreground">
              {job.contractFiles}
            </p>
            <p className="text-xs text-muted-foreground">Contracts</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-2xl font-bold text-foreground">
              {job.frontendFiles}
            </p>
            <p className="text-xs text-muted-foreground">Frontend Files</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-2xl font-bold text-foreground">
              {job.testFiles}
            </p>
            <p className="text-xs text-muted-foreground">Tests</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {isFailed && job.error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm font-medium text-red-400">Error</p>
          <p className="mt-1 text-sm text-red-300">{job.error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-center gap-4">
        {isComplete && (
          <>
            <a
              href="/app"
              className="inline-flex h-10 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              View Project
            </a>
            <a
              href="/app/templates"
              className="inline-flex h-10 items-center rounded-md border border-border bg-surface-container px-6 text-sm font-medium text-foreground hover:bg-surface-container-high"
            >
              Build Another
            </a>
          </>
        )}
        {isFailed && (
          <a
            href="/app/templates"
            className="inline-flex h-10 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Try Again
          </a>
        )}
      </div>
    </div>
  );
}
