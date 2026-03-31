// ---------------------------------------------------------------------------
// Chart data transformer — SimOutput -> Recharts-ready datasets
// ---------------------------------------------------------------------------
// Transforms raw simulation output into structured chart datasets that the
// React dashboard can render directly via Recharts. Each chart builder
// returns a self-describing ChartDataSet with axis labels, series metadata,
// and pre-mapped data points.
// ---------------------------------------------------------------------------

import type { SimOutput, StepSnapshot } from "./types";

// ---- Zapp design-system colors ----

const COLOR = {
  primary: "#6366F1", // indigo-500
  secondary: "#818CF8", // indigo-400
  green: "#22C55E", // green-500
  yellow: "#EAB308", // yellow-500
  red: "#EF4444", // red-500
  muted: "#64748B", // slate-500
  // Area fills — same hue at 20% opacity (hex "33" suffix)
  primaryFill: "#6366F133",
  secondaryFill: "#818CF833",
  greenFill: "#22C55E33",
  yellowFill: "#EAB30833",
  redFill: "#EF444433",
  mutedFill: "#64748B33",
} as const;

// ---- Public interfaces ----

/** Single data point for Recharts — step is the x-axis key. */
export interface ChartPoint {
  step: number;
  [key: string]: number;
}

/** Metadata for a single line/area/bar series within a chart. */
export interface ChartSeries {
  /** Key into ChartPoint — must match a property on every data point. */
  key: string;
  /** Human-readable legend label. */
  label: string;
  /** Hex color. */
  color: string;
  /** Recharts series type. */
  type: "line" | "area" | "bar";
  /** Render as dashed stroke (useful for projections / comparisons). */
  dashed?: boolean;
}

/** A fully self-describing chart dataset ready for Recharts rendering. */
export interface ChartDataSet {
  /** Unique identifier for the chart (used as React key). */
  id: string;
  /** Display title shown above the chart. */
  title: string;
  /** Label for the x-axis. */
  xAxisLabel: string;
  /** Label for the y-axis. */
  yAxisLabel: string;
  /** Format hint so the UI can apply the right tick formatter. */
  yAxisFormat: "usd" | "percent" | "number" | "token";
  /** Series descriptors (ordering determines z-order / legend order). */
  series: ChartSeries[];
  /** The actual data points, one per simulation step. */
  data: ChartPoint[];
}

// ---- Transform entry point ----

/**
 * Transform a complete simulation output into chart-ready datasets.
 *
 * Returns all 7 charts. The dashboard can choose which to show
 * (e.g. primary 2x2 grid vs. secondary detail charts).
 */
export function transformToChartData(output: SimOutput): ChartDataSet[] {
  const { snapshots } = output;
  return [
    buildPriceChart(snapshots),
    buildTreasuryChart(snapshots),
    buildApyChart(snapshots),
    buildUserActivityChart(snapshots),
    buildSupplyChart(snapshots),
    buildFeeCoverageChart(snapshots),
    buildPressureChart(snapshots),
  ];
}

// ---- Individual chart builders ----

/**
 * Chart 1 — Token Price over time.
 * Primary chart; shown top-left in the 2x2 grid.
 */
function buildPriceChart(snapshots: StepSnapshot[]): ChartDataSet {
  return {
    id: "token-price",
    title: "Token Price",
    xAxisLabel: "Step",
    yAxisLabel: "Price (USD)",
    yAxisFormat: "usd",
    series: [
      {
        key: "tokenPrice",
        label: "Token Price",
        color: COLOR.primary,
        type: "area",
      },
      {
        key: "marketCap",
        label: "Market Cap",
        color: COLOR.muted,
        type: "line",
        dashed: true,
      },
    ],
    data: snapshots.map((s) => ({
      step: s.step,
      tokenPrice: s.state.tokenPrice,
      marketCap: s.state.marketCap,
    })),
  };
}

/**
 * Chart 2 — Treasury Balance over time.
 * Shows both token-denominated and USD-equivalent treasury balance.
 */
function buildTreasuryChart(snapshots: StepSnapshot[]): ChartDataSet {
  return {
    id: "treasury-balance",
    title: "Treasury Balance",
    xAxisLabel: "Step",
    yAxisLabel: "Balance",
    yAxisFormat: "usd",
    series: [
      {
        key: "treasuryUsd",
        label: "Treasury (USD)",
        color: COLOR.primary,
        type: "area",
      },
      {
        key: "treasuryTokens",
        label: "Treasury (Tokens)",
        color: COLOR.secondary,
        type: "line",
        dashed: true,
      },
      {
        key: "runwaySteps",
        label: "Runway (Steps)",
        color: COLOR.yellow,
        type: "line",
        dashed: true,
      },
    ],
    data: snapshots.map((s) => ({
      step: s.step,
      treasuryUsd: s.state.treasuryBalanceTokens * s.state.tokenPrice,
      treasuryTokens: s.state.treasuryBalanceTokens,
      runwaySteps: s.state.treasuryRunwaySteps,
    })),
  };
}

/**
 * Chart 3 — APY (nominal vs real) over time.
 * Shows the gap between headline APY and inflation-adjusted real APY.
 * A persistent negative real APY is a key risk signal.
 */
function buildApyChart(snapshots: StepSnapshot[]): ChartDataSet {
  return {
    id: "apy",
    title: "Staking APY",
    xAxisLabel: "Step",
    yAxisLabel: "APY",
    yAxisFormat: "percent",
    series: [
      {
        key: "nominalApy",
        label: "Nominal APY",
        color: COLOR.primary,
        type: "line",
      },
      {
        key: "realApy",
        label: "Real APY",
        color: COLOR.green,
        type: "area",
      },
    ],
    data: snapshots.map((s) => ({
      step: s.step,
      nominalApy: s.state.nominalApy,
      realApy: s.state.realApy,
    })),
  };
}

/**
 * Chart 4 — User Activity over time.
 * Tracks active users, new entries, and exits per step.
 */
function buildUserActivityChart(
  snapshots: StepSnapshot[],
): ChartDataSet {
  return {
    id: "user-activity",
    title: "User Activity",
    xAxisLabel: "Step",
    yAxisLabel: "Users",
    yAxisFormat: "number",
    series: [
      {
        key: "activeUsers",
        label: "Active Users",
        color: COLOR.primary,
        type: "area",
      },
      {
        key: "newUsers",
        label: "New Users",
        color: COLOR.green,
        type: "bar",
      },
      {
        key: "exitedUsers",
        label: "Exited Users",
        color: COLOR.red,
        type: "bar",
      },
    ],
    data: snapshots.map((s) => ({
      step: s.step,
      activeUsers: s.state.activeUsers,
      newUsers: s.state.newUsersThisStep,
      exitedUsers: s.state.exitedUsersThisStep,
    })),
  };
}

/**
 * Chart 5 — Supply Breakdown.
 * Shows total supply, circulating supply, and total staked.
 */
function buildSupplyChart(snapshots: StepSnapshot[]): ChartDataSet {
  return {
    id: "supply-breakdown",
    title: "Supply Breakdown",
    xAxisLabel: "Step",
    yAxisLabel: "Tokens",
    yAxisFormat: "token",
    series: [
      {
        key: "totalSupply",
        label: "Total Supply",
        color: COLOR.muted,
        type: "line",
        dashed: true,
      },
      {
        key: "circulatingSupply",
        label: "Circulating Supply",
        color: COLOR.primary,
        type: "area",
      },
      {
        key: "totalStaked",
        label: "Total Staked",
        color: COLOR.secondary,
        type: "area",
      },
    ],
    data: snapshots.map((s) => ({
      step: s.step,
      totalSupply: s.state.totalSupply,
      circulatingSupply: s.state.circulatingSupply,
      totalStaked: s.state.totalStaked,
    })),
  };
}

/**
 * Chart 6 — Fee Coverage Ratio over time.
 * Shows what fraction of reward distributions is covered by protocol fees.
 * A ratio < 1.0 means the protocol is subsidy-dependent; a ratio >= 1.0
 * means the protocol is self-sustaining.
 */
function buildFeeCoverageChart(snapshots: StepSnapshot[]): ChartDataSet {
  return {
    id: "fee-coverage",
    title: "Fee Coverage Ratio",
    xAxisLabel: "Step",
    yAxisLabel: "Ratio",
    yAxisFormat: "number",
    series: [
      {
        key: "feeCoverageRatio",
        label: "Fee Coverage",
        color: COLOR.primary,
        type: "area",
      },
      {
        key: "sustainabilityLine",
        label: "Sustainability (1.0)",
        color: COLOR.yellow,
        type: "line",
        dashed: true,
      },
    ],
    data: snapshots.map((s) => ({
      step: s.step,
      feeCoverageRatio: s.state.feeCoverageRatio,
      sustainabilityLine: 1.0,
    })),
  };
}

/**
 * Chart 7 — Buy/Sell Pressure Decomposition.
 * Visualizes the forces acting on token price each step.
 */
function buildPressureChart(snapshots: StepSnapshot[]): ChartDataSet {
  return {
    id: "pressure",
    title: "Buy / Sell Pressure",
    xAxisLabel: "Step",
    yAxisLabel: "USD",
    yAxisFormat: "usd",
    series: [
      {
        key: "buyPressure",
        label: "Buy Pressure",
        color: COLOR.green,
        type: "bar",
      },
      {
        key: "sellPressure",
        label: "Sell Pressure",
        color: COLOR.red,
        type: "bar",
      },
      {
        key: "netPressure",
        label: "Net Pressure",
        color: COLOR.primary,
        type: "line",
      },
    ],
    data: snapshots.map((s) => ({
      step: s.step,
      buyPressure: s.state.buyPressureUsd,
      sellPressure: -Math.abs(s.state.sellPressureUsd), // negative for visual stacking
      netPressure: s.state.netPressureUsd,
    })),
  };
}

// ---- Utility: extract a single chart by ID ----

/**
 * Extract a single chart from the full set by its ID.
 * Returns undefined if the ID is not found.
 */
export function getChartById(
  charts: ChartDataSet[],
  id: string,
): ChartDataSet | undefined {
  return charts.find((c) => c.id === id);
}

/**
 * Get the 4 primary charts intended for the 2x2 grid.
 * Order: price, treasury, APY, user activity.
 */
export function getPrimaryCharts(output: SimOutput): ChartDataSet[] {
  const all = transformToChartData(output);
  const primaryIds = ["token-price", "treasury-balance", "apy", "user-activity"];
  return primaryIds
    .map((id) => all.find((c) => c.id === id))
    .filter((c): c is ChartDataSet => c !== undefined);
}

/**
 * Get the secondary/detail charts.
 * Order: supply breakdown, fee coverage, pressure.
 */
export function getSecondaryCharts(output: SimOutput): ChartDataSet[] {
  const all = transformToChartData(output);
  const secondaryIds = ["supply-breakdown", "fee-coverage", "pressure"];
  return secondaryIds
    .map((id) => all.find((c) => c.id === id))
    .filter((c): c is ChartDataSet => c !== undefined);
}
