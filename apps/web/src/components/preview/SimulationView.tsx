"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { cn } from "@zapp/ui";
import { usePreviewStore } from "../../stores/preview-store";

// ---------------------------------------------------------------------------
// Types for simulation data we expect to receive
// ---------------------------------------------------------------------------

interface SimFactor {
  label: string;
  severity: string;
  description: string;
}

interface SimRisk {
  level?: string;
  summary?: string;
  factors?: SimFactor[];
}

interface SimulationData {
  metrics?: Record<string, unknown>;
  risk?: SimRisk;
  charts?: {
    price?: { step: number; tokenPrice: number }[];
    apy?: { step: number; nominalApy: number; realApy: number }[];
    users?: { step: number; activeUsers: number; newUsersThisStep: number }[];
    treasury?: { step: number; treasuryBalanceUsd: number; feeRevenueThisStep: number }[];
    supply?: { step: number; totalSupply: number; circulatingSupply: number; totalStaked: number }[];
    fees?: { step: number; cumulativeFeeRevenue: number; feeCoverageRatio: number }[];
    pressure?: { step: number; buyPressureUsd: number; sellPressureUsd: number; netPressureUsd: number }[];
  };
  // Legacy format support
  chartData?: { step: number; [key: string]: number }[];
  chartKeys?: string[];
}

// ---------------------------------------------------------------------------
// Type guard
// ---------------------------------------------------------------------------

function isSimulationData(value: unknown): value is SimulationData {
  return typeof value === "object" && value !== null;
}

// ---------------------------------------------------------------------------
// Chart tab config
// ---------------------------------------------------------------------------

type ChartTabId = "price" | "apy" | "users" | "treasury" | "supply" | "fees" | "pressure";

interface ChartTabConfig {
  id: ChartTabId;
  label: string;
  keys: { dataKey: string; name: string; color: string; type?: "area" | "line" }[];
  yFormatter: (v: number) => string;
  tooltipFormatter?: (v: number) => string;
}

const CHART_TABS: ChartTabConfig[] = [
  {
    id: "price",
    label: "Price",
    keys: [{ dataKey: "tokenPrice", name: "Token Price", color: "#8ff5ff" }],
    yFormatter: (v) => formatUsd(v),
    tooltipFormatter: (v) => formatUsd(v),
  },
  {
    id: "apy",
    label: "APY",
    keys: [
      { dataKey: "nominalApy", name: "Nominal APY", color: "#f3ffca" },
      { dataKey: "realApy", name: "Real APY", color: "#ff716c" },
    ],
    yFormatter: (v) => `${v.toFixed(0)}%`,
    tooltipFormatter: (v) => `${v.toFixed(2)}%`,
  },
  {
    id: "users",
    label: "Users",
    keys: [
      { dataKey: "activeUsers", name: "Active Users", color: "#ac89ff" },
      { dataKey: "newUsersThisStep", name: "New Users", color: "#8ff5ff", type: "area" },
    ],
    yFormatter: formatNumber,
  },
  {
    id: "treasury",
    label: "Treasury",
    keys: [
      { dataKey: "treasuryBalanceUsd", name: "Treasury (USD)", color: "#f3ffca" },
      { dataKey: "feeRevenueThisStep", name: "Fee Revenue", color: "#00deec", type: "area" },
    ],
    yFormatter: (v) => formatUsd(v),
    tooltipFormatter: (v) => formatUsd(v),
  },
  {
    id: "supply",
    label: "Supply",
    keys: [
      { dataKey: "totalSupply", name: "Total Supply", color: "#8ff5ff" },
      { dataKey: "circulatingSupply", name: "Circulating", color: "#ac89ff" },
      { dataKey: "totalStaked", name: "Staked", color: "#f3ffca" },
    ],
    yFormatter: formatNumber,
  },
  {
    id: "fees",
    label: "Fees",
    keys: [
      { dataKey: "cumulativeFeeRevenue", name: "Cumulative Fees", color: "#00deec" },
      { dataKey: "feeCoverageRatio", name: "Coverage Ratio", color: "#ff716c" },
    ],
    yFormatter: formatNumber,
  },
  {
    id: "pressure",
    label: "Pressure",
    keys: [
      { dataKey: "buyPressureUsd", name: "Buy Pressure", color: "#f3ffca", type: "area" },
      { dataKey: "sellPressureUsd", name: "Sell Pressure", color: "#ff716c", type: "area" },
      { dataKey: "netPressureUsd", name: "Net Pressure", color: "#8ff5ff" },
    ],
    yFormatter: (v) => formatUsd(v),
    tooltipFormatter: (v) => formatUsd(v),
  },
];

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
        "rounded-sm p-3 transition-colors",
        accentColors[accent],
      )}
    >
      <p className="text-[10px] font-label font-medium uppercase tracking-wider text-on-surface-variant">
        {label}
      </p>
      <p className={cn("mt-0.5 text-lg font-bold", valueColors[accent])}>
        {value}
      </p>
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
    low: "bg-tertiary/20 text-tertiary",
    medium: "bg-tertiary/10 text-tertiary",
    high: "bg-error/20 text-error",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 font-label text-xs font-semibold",
        styles[level] ?? styles.medium,
      )}
    >
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Risk factor list
// ---------------------------------------------------------------------------

function RiskFactors({ factors }: { factors: SimFactor[] }) {
  if (factors.length === 0) return null;

  const severityColors: Record<string, string> = {
    low: "text-tertiary",
    medium: "text-tertiary",
    high: "text-error",
    critical: "text-error",
  };

  return (
    <div className="space-y-2">
      {factors.map((f, i) => (
        <div
          key={i}
          className="rounded-sm bg-surface-container-high p-3"
        >
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-xs font-semibold uppercase",
                severityColors[f.severity] ?? "text-on-surface-variant",
              )}
            >
              {f.severity}
            </span>
            <span className="text-xs font-medium text-on-surface">
              {f.label}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-on-surface-variant">
            {f.description}
          </p>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
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
// Chart component
// ---------------------------------------------------------------------------

const TOOLTIP_STYLE = {
  backgroundColor: "#201f21",
  border: "none",
  borderRadius: 12,
  color: "#e6e1e5",
  fontSize: 12,
};

const LABEL_STYLE = {
  color: "#c4c0c5",
  fontWeight: 600,
  marginBottom: 4,
};

const AXIS_STYLE = { fill: "#c4c0c5", fontSize: 11 };
const AXIS_LINE_STYLE = { stroke: "#49454f" };

function SimChart({ tab, data }: { tab: ChartTabConfig; data: unknown[] }) {
  const hasArea = tab.keys.some((k) => k.type === "area");

  if (hasArea) {
    return (
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 4, right: 12, bottom: 4, left: 8 }}>
          <XAxis dataKey="step" tick={AXIS_STYLE} axisLine={AXIS_LINE_STYLE} tickLine={AXIS_LINE_STYLE} />
          <YAxis tick={AXIS_STYLE} axisLine={AXIS_LINE_STYLE} tickLine={AXIS_LINE_STYLE} width={70} tickFormatter={tab.yFormatter} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={LABEL_STYLE}
            labelFormatter={(label: number) => `Day ${label}`}
            formatter={tab.tooltipFormatter ? (v: number) => tab.tooltipFormatter!(v) : undefined}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: "#c4c0c5" }} />
          {tab.keys.map((k) =>
            k.type === "area" ? (
              <Area
                key={k.dataKey}
                type="monotone"
                dataKey={k.dataKey}
                name={k.name}
                stroke={k.color}
                fill={k.color}
                fillOpacity={0.15}
                strokeWidth={2}
              />
            ) : (
              <Line
                key={k.dataKey}
                type="monotone"
                dataKey={k.dataKey}
                name={k.name}
                stroke={k.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0 }}
              />
            ),
          )}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 4, right: 12, bottom: 4, left: 8 }}>
        <XAxis dataKey="step" tick={AXIS_STYLE} axisLine={AXIS_LINE_STYLE} tickLine={AXIS_LINE_STYLE} />
        <YAxis tick={AXIS_STYLE} axisLine={AXIS_LINE_STYLE} tickLine={AXIS_LINE_STYLE} width={70} tickFormatter={tab.yFormatter} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelStyle={LABEL_STYLE}
          labelFormatter={(label: number) => `Day ${label}`}
          formatter={tab.tooltipFormatter ? (v: number) => tab.tooltipFormatter!(v) : undefined}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: "#c4c0c5" }} />
        {tab.keys.map((k) => (
          <Line
            key={k.dataKey}
            type="monotone"
            dataKey={k.dataKey}
            name={k.name}
            stroke={k.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SimulationView() {
  const simulationResults = usePreviewStore((s) => s.simulationResults);
  const [activeChart, setActiveChart] = useState<ChartTabId>("price");

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
        <p className="font-display text-sm text-on-surface">
          Run a simulation to see results here
        </p>
        <p className="max-w-xs text-center text-xs text-on-surface-variant">
          Ask the AI to simulate your tokenomics — it will project price,
          APY, user growth, treasury health, and more.
        </p>
      </div>
    );
  }

  const metrics = data.metrics as Record<string, number | string> | undefined;
  const risk = data.risk;
  const charts = data.charts;

  // Determine which chart tabs have data
  const availableTabs = charts
    ? CHART_TABS.filter((t) => {
        const chartData = charts[t.id];
        return chartData && chartData.length > 0;
      })
    : [];

  // Get current chart data
  const currentTab = CHART_TABS.find((t) => t.id === activeChart) ?? CHART_TABS[0]!;
  const currentChartData = currentTab && charts ? charts[currentTab.id] : undefined;

  // Fallback to legacy format if no new charts
  const legacyChartData = data.chartData;
  const legacyChartKeys = data.chartKeys ?? [];

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      {/* Risk header */}
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
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
          {metrics.finalPrice != null && (
            <MetricCard
              label="Final Price"
              value={formatUsd(metrics.finalPrice as number)}
              accent="primary"
            />
          )}
          {metrics.priceChange != null && (
            <MetricCard
              label="Price Change"
              value={`${(metrics.priceChange as number) > 0 ? "+" : ""}${(metrics.priceChange as number).toFixed(1)}%`}
              accent={(metrics.priceChange as number) >= 0 ? "green" : "red"}
            />
          )}
          {metrics.finalApy != null && (
            <MetricCard
              label="Nominal APY"
              value={formatPercent(metrics.finalApy as number)}
              accent={(metrics.finalApy as number) > 20 ? "green" : "yellow"}
            />
          )}
          {metrics.realApy != null && (
            <MetricCard
              label="Real APY"
              value={formatPercent(metrics.realApy as number)}
              accent={(metrics.realApy as number) > 0 ? "green" : "red"}
            />
          )}
          {metrics.finalStakingRatio != null && (
            <MetricCard
              label="Staking Ratio"
              value={formatPercent(metrics.finalStakingRatio as number)}
              accent={(metrics.finalStakingRatio as number) > 40 ? "green" : "yellow"}
            />
          )}
          {metrics.activeUsers != null && (
            <MetricCard
              label="Active Users"
              value={formatNumber(metrics.activeUsers as number)}
              accent="primary"
            />
          )}
          {metrics.treasuryRunwaySteps != null && (
            <MetricCard
              label="Treasury Runway"
              value={
                metrics.treasuryRunwaySteps === "Infinite"
                  ? "Unlimited"
                  : `${metrics.treasuryRunwaySteps} days`
              }
              accent={
                metrics.treasuryRunwaySteps === "Infinite" ||
                (metrics.treasuryRunwaySteps as number) > 100
                  ? "green"
                  : (metrics.treasuryRunwaySteps as number) > 30
                    ? "yellow"
                    : "red"
              }
            />
          )}
          {metrics.feeCoverageRatio != null && (
            <MetricCard
              label="Fee Coverage"
              value={`${((metrics.feeCoverageRatio as number) * 100).toFixed(0)}%`}
              accent={
                (metrics.feeCoverageRatio as number) > 0.8
                  ? "green"
                  : (metrics.feeCoverageRatio as number) > 0.3
                    ? "yellow"
                    : "red"
              }
            />
          )}
        </div>
      )}

      {/* Risk factors */}
      {risk?.factors && risk.factors.length > 0 && (
        <RiskFactors factors={risk.factors} />
      )}

      {/* Chart tabs + chart */}
      {availableTabs.length > 0 && (
        <div className="rounded-sm bg-surface-container-high p-4">
          {/* Tab bar */}
          <div className="mb-3 flex gap-1 overflow-x-auto">
            {availableTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveChart(tab.id)}
                className={cn(
                  "whitespace-nowrap rounded-sm px-3 py-1.5 text-xs font-medium transition-colors",
                  activeChart === tab.id
                    ? "bg-primary/20 text-primary"
                    : "text-on-surface-variant hover:bg-surface-bright hover:text-on-surface",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Active chart */}
          {currentTab && currentChartData && currentChartData.length > 0 && (
            <SimChart tab={currentTab} data={currentChartData} />
          )}
        </div>
      )}

      {/* Legacy chart fallback (for old simulation data format) */}
      {availableTabs.length === 0 &&
        legacyChartData &&
        legacyChartData.length > 0 &&
        legacyChartKeys.length > 0 && (
          <div className="rounded-sm bg-surface-container-high p-4">
            <h3 className="mb-3 font-display text-sm font-semibold text-on-surface">
              Performance Over Time
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart
                data={legacyChartData}
                margin={{ top: 4, right: 12, bottom: 4, left: 8 }}
              >
                <XAxis dataKey="step" tick={AXIS_STYLE} axisLine={AXIS_LINE_STYLE} tickLine={AXIS_LINE_STYLE} />
                <YAxis tick={AXIS_STYLE} axisLine={AXIS_LINE_STYLE} tickLine={AXIS_LINE_STYLE} width={60} tickFormatter={formatNumber} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelStyle={LABEL_STYLE}
                  labelFormatter={(label: number) => `Step ${label}`}
                />
                {legacyChartKeys.map((key, idx) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={["#8ff5ff", "#ac89ff", "#f3ffca", "#00deec", "#ff716c", "#874cff"][idx % 6]}
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
