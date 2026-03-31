"use client";

import type { ChartDataSet } from "@zapp/simulation";
import { SimChart } from "./sim-chart";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ChartGridProps {
  charts: ChartDataSet[];
  loading?: boolean;
}

// ---------------------------------------------------------------------------
// Skeleton placeholder for loading state
// ---------------------------------------------------------------------------

function ChartSkeleton() {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-4">
      {/* Title skeleton */}
      <div className="mb-3 h-4 w-32 animate-pulse rounded bg-slate-700" />
      {/* Chart area skeleton */}
      <div className="h-[280px] w-full animate-pulse rounded-lg bg-slate-700/60" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="col-span-full flex min-h-[320px] items-center justify-center rounded-xl border border-dashed border-slate-700/50 bg-slate-800/30">
      <p className="text-sm text-slate-500">
        Run a simulation to see charts
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ChartGrid({ charts, loading = false }: ChartGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton />
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    );
  }

  if (!charts || charts.length === 0) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {charts.map((dataset) => (
        <div
          key={dataset.id}
          className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-4"
        >
          <SimChart dataset={dataset} />
        </div>
      ))}
    </div>
  );
}
