"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@zapp/ui";
import { usePreviewStore } from "../../stores/preview-store";

// ---------------------------------------------------------------------------
// Types for simulation data we expect to receive
// ---------------------------------------------------------------------------

interface SimMetrics {
  nominalApy?: number;
  realApy?: number;
  stakingRatio?: number;
  treasuryRunwaySteps?: number;
  maxDrawdown?: number;
  tokenPrice?: number;
  totalStaked?: number;
  activeUsers?: number;
  feeCoverageRatio?: number;
}

interface SimRisk {
  level?: "sustainable" | "caution" | "unsustainable";
  summary?: string;
}

interface SimChartPoint {
  step: number;
  [key: string]: number;
}

interface SimulationData {
  metrics?: SimMetrics;
  risk?: SimRisk;
  chartData?: SimChartPoint[];
  chartKeys?: string[];
}

// ---------------------------------------------------------------------------
// Type guard
// ---------------------------------------------------------------------------

function isSimulationData(value: unknown): value is SimulationData {
  return typeof value === "object" && value !== null;
}

// ---------------------------------------------------------------------------
// Metric card
// ---------------------------------------------------------------------------

interface MetricCardProps {
  label: string;
  value: string;
  accent?: "indigo" | "green" | "red" | "yellow" | "gray";
  subtitle?: string;
}

function MetricCard({
  label,
  value,
  accent = "gray",
  subtitle,
}: MetricCardProps) {
  const accentColors: Record<string, string> = {
    indigo: "border-indigo-500/30 bg-indigo-500/5",
    green: "border-green-500/30 bg-green-500/5",
    red: "border-red-500/30 bg-red-500/5",
    yellow: "border-yellow-500/30 bg-yellow-500/5",
    gray: "border-gray-700 bg-gray-800/50",
  };

  const valueColors: Record<string, string> = {
    indigo: "text-indigo-300",
    green: "text-green-300",
    red: "text-red-300",
    yellow: "text-yellow-300",
    gray: "text-white",
  };

  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition-colors",
        accentColors[accent],
      )}
    >
      <p className="text-xs font-medium text-gray-400">{label}</p>
      <p className={cn("mt-1 text-xl font-bold", valueColors[accent])}>
        {value}
      </p>
      {subtitle && (
        <p className="mt-0.5 text-[10px] text-gray-500">{subtitle}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Risk badge
// ---------------------------------------------------------------------------

function RiskBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    sustainable: "bg-green-500/20 text-green-300 border-green-500/30",
    caution: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    unsustainable: "bg-red-500/20 text-red-300 border-red-500/30",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        styles[level] ?? styles.caution,
      )}
    >
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(2);
}

function formatUsd(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// Tooltip for chart
// ---------------------------------------------------------------------------

const CHART_COLORS = [
  "#818cf8", // indigo-400
  "#34d399", // emerald-400
  "#f87171", // red-400
  "#fbbf24", // amber-400
  "#60a5fa", // blue-400
  "#a78bfa", // violet-400
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SimulationView() {
  const simulationResults = usePreviewStore((s) => s.simulationResults);

  const data = useMemo<SimulationData | null>(() => {
    if (!simulationResults) return null;
    if (isSimulationData(simulationResults)) return simulationResults;
    return null;
  }, [simulationResults]);

  // --- Empty state ---
  if (!data) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-500">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className="h-12 w-12 text-gray-600"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605"
          />
        </svg>
        <p className="text-sm">Run a simulation to see results here</p>
        <p className="max-w-xs text-center text-xs text-gray-600">
          Simulation results will show key metrics, risk analysis, and
          performance charts
        </p>
      </div>
    );
  }

  const metrics = data.metrics;
  const risk = data.risk;
  const chartData = data.chartData;
  const chartKeys = data.chartKeys ?? [];

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-4">
      {/* Risk badge */}
      {risk?.level && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-300">
            Risk Assessment
          </h3>
          <RiskBadge level={risk.level} />
        </div>
      )}

      {risk?.summary && (
        <p className="text-xs text-gray-400">{risk.summary}</p>
      )}

      {/* Key metrics grid */}
      {metrics && (
        <div className="grid grid-cols-2 gap-3">
          {metrics.nominalApy != null && (
            <MetricCard
              label="Nominal APY"
              value={formatPercent(metrics.nominalApy)}
              accent={metrics.nominalApy > 0.2 ? "green" : "yellow"}
              subtitle="Annual yield for stakers"
            />
          )}
          {metrics.realApy != null && (
            <MetricCard
              label="Real APY"
              value={formatPercent(metrics.realApy)}
              accent={metrics.realApy > 0 ? "green" : "red"}
              subtitle="Adjusted for token price"
            />
          )}
          {risk?.level != null && (
            <MetricCard
              label="Risk Level"
              value={risk.level.charAt(0).toUpperCase() + risk.level.slice(1)}
              accent={
                risk.level === "sustainable"
                  ? "green"
                  : risk.level === "caution"
                    ? "yellow"
                    : "red"
              }
            />
          )}
          {metrics.treasuryRunwaySteps != null && (
            <MetricCard
              label="Treasury Runway"
              value={
                metrics.treasuryRunwaySteps === Infinity
                  ? "Unlimited"
                  : `${metrics.treasuryRunwaySteps.toFixed(0)} steps`
              }
              accent={
                metrics.treasuryRunwaySteps > 100
                  ? "green"
                  : metrics.treasuryRunwaySteps > 30
                    ? "yellow"
                    : "red"
              }
            />
          )}
          {metrics.maxDrawdown != null && (
            <MetricCard
              label="Max Drawdown"
              value={formatPercent(Math.abs(metrics.maxDrawdown))}
              accent={Math.abs(metrics.maxDrawdown) < 0.2 ? "green" : "red"}
              subtitle="Worst peak-to-trough decline"
            />
          )}
          {metrics.tokenPrice != null && (
            <MetricCard
              label="Token Price"
              value={formatUsd(metrics.tokenPrice)}
              accent="indigo"
            />
          )}
          {metrics.stakingRatio != null && (
            <MetricCard
              label="Staking Ratio"
              value={formatPercent(metrics.stakingRatio)}
              accent={metrics.stakingRatio > 0.4 ? "green" : "yellow"}
              subtitle="% of supply staked"
            />
          )}
          {metrics.feeCoverageRatio != null && (
            <MetricCard
              label="Fee Coverage"
              value={formatPercent(metrics.feeCoverageRatio)}
              accent={
                metrics.feeCoverageRatio > 0.8
                  ? "green"
                  : metrics.feeCoverageRatio > 0.3
                    ? "yellow"
                    : "red"
              }
              subtitle="Revenue vs emissions"
            />
          )}
        </div>
      )}

      {/* Chart */}
      {chartData && chartData.length > 0 && chartKeys.length > 0 && (
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-300">
            Performance Over Time
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart
              data={chartData}
              margin={{ top: 4, right: 12, bottom: 4, left: 8 }}
            >
              <XAxis
                dataKey="step"
                tick={{ fill: "#94A3B8", fontSize: 11 }}
                axisLine={{ stroke: "#334155" }}
                tickLine={{ stroke: "#334155" }}
              />
              <YAxis
                tick={{ fill: "#94A3B8", fontSize: 11 }}
                axisLine={{ stroke: "#334155" }}
                tickLine={{ stroke: "#334155" }}
                width={60}
                tickFormatter={formatNumber}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1E293B",
                  border: "1px solid #334155",
                  borderRadius: 8,
                  color: "#F8FAFC",
                  fontSize: 12,
                }}
                labelStyle={{
                  color: "#94A3B8",
                  fontWeight: 600,
                  marginBottom: 4,
                }}
                labelFormatter={(label: number) => `Step ${label}`}
              />
              {chartKeys.map((key, idx) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3, strokeWidth: 0 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
