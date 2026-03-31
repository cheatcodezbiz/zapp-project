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
  accent?: "primary" | "green" | "red" | "yellow" | "gray";
  subtitle?: string;
}

function MetricCard({
  label,
  value,
  accent = "gray",
  subtitle,
}: MetricCardProps) {
  const accentColors: Record<string, string> = {
    primary: "bg-primary/5",
    green: "bg-tertiary/5",
    red: "bg-error/5",
    yellow: "bg-tertiary/10",
    gray: "bg-surface-container-high",
  };

  const valueColors: Record<string, string> = {
    primary: "text-primary",
    green: "text-tertiary",
    red: "text-error",
    yellow: "text-tertiary",
    gray: "text-on-surface",
  };

  return (
    <div
      className={cn(
        "rounded-sm p-4 transition-colors",
        accentColors[accent],
      )}
    >
      <p className="text-xs font-label font-medium text-on-surface-variant">{label}</p>
      <p className={cn("mt-1 text-xl font-bold", valueColors[accent])}>
        {value}
      </p>
      {subtitle && (
        <p className="mt-0.5 text-[10px] text-on-surface-variant/50">{subtitle}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Risk badge
// ---------------------------------------------------------------------------

function RiskBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    sustainable: "bg-tertiary/20 text-tertiary",
    caution: "bg-tertiary/10 text-tertiary",
    unsustainable: "bg-error/20 text-error",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 font-label text-xs font-semibold",
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
  "#8ff5ff", // primary
  "#ac89ff", // secondary
  "#f3ffca", // tertiary
  "#00deec", // primary-dim
  "#ff716c", // error
  "#874cff", // secondary-dim
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
      <div className="flex h-full flex-col items-center justify-center gap-3 text-on-surface-variant">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className="h-12 w-12 text-surface-bright"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605"
          />
        </svg>
        <p className="font-display text-sm text-on-surface">Run a simulation to see results here</p>
        <p className="max-w-xs text-center text-xs text-on-surface-variant">
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
          <h3 className="font-display text-sm font-semibold text-on-surface">
            Risk Assessment
          </h3>
          <RiskBadge level={risk.level} />
        </div>
      )}

      {risk?.summary && (
        <p className="text-xs text-on-surface-variant">{risk.summary}</p>
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
              accent="primary"
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
        <div className="rounded-sm bg-surface-container-high p-4">
          <h3 className="mb-3 font-display text-sm font-semibold text-on-surface">
            Performance Over Time
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart
              data={chartData}
              margin={{ top: 4, right: 12, bottom: 4, left: 8 }}
            >
              <XAxis
                dataKey="step"
                tick={{ fill: "#c4c0c5", fontSize: 11 }}
                axisLine={{ stroke: "#49454f" }}
                tickLine={{ stroke: "#49454f" }}
              />
              <YAxis
                tick={{ fill: "#c4c0c5", fontSize: 11 }}
                axisLine={{ stroke: "#49454f" }}
                tickLine={{ stroke: "#49454f" }}
                width={60}
                tickFormatter={formatNumber}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#201f21",
                  border: "none",
                  borderRadius: 12,
                  color: "#e6e1e5",
                  fontSize: 12,
                }}
                labelStyle={{
                  color: "#c4c0c5",
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
