"use client";

import { useMemo, useCallback } from "react";
import {
  ComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { ChartDataSet, ChartSeries } from "@zapp/simulation";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SimChartProps {
  dataset: ChartDataSet;
  height?: number;
}

// ---------------------------------------------------------------------------
// Y-axis formatters
// ---------------------------------------------------------------------------

function formatUsd(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatNumber(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function formatToken(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(2);
}

function getFormatter(
  format: ChartDataSet["yAxisFormat"],
): (value: number) => string {
  switch (format) {
    case "usd":
      return formatUsd;
    case "percent":
      return formatPercent;
    case "number":
      return formatNumber;
    case "token":
      return formatToken;
  }
}

// ---------------------------------------------------------------------------
// Tooltip value formatter (longer form for readability in tooltips)
// ---------------------------------------------------------------------------

function tooltipFormatUsd(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

function tooltipFormatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function tooltipFormatToken(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(3)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(3)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return value.toFixed(2);
}

function getTooltipFormatter(
  format: ChartDataSet["yAxisFormat"],
): (value: number) => string {
  switch (format) {
    case "usd":
      return tooltipFormatUsd;
    case "percent":
      return tooltipFormatPercent;
    case "number":
      return formatNumber;
    case "token":
      return tooltipFormatToken;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SimChart({ dataset, height = 280 }: SimChartProps) {
  const yFormatter = useMemo(
    () => getFormatter(dataset.yAxisFormat),
    [dataset.yAxisFormat],
  );
  const tooltipFormatter = useMemo(
    () => getTooltipFormatter(dataset.yAxisFormat),
    [dataset.yAxisFormat],
  );

  // Build a lookup from series key -> label for the tooltip
  const labelMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of dataset.series) {
      map[s.key] = s.label;
    }
    return map;
  }, [dataset.series]);

  const renderTooltipValue = useCallback(
    (value: number, name: string) => {
      return [tooltipFormatter(value), labelMap[name] ?? name];
    },
    [tooltipFormatter, labelMap],
  );

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium text-slate-300 pl-1">
        {dataset.title}
      </h3>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={dataset.data}
          margin={{ top: 4, right: 12, bottom: 4, left: 8 }}
        >
          {/* Subtle horizontal reference line at zero for charts with negative values */}
          <ReferenceLine y={0} stroke="#334155" strokeWidth={1} />

          <XAxis
            dataKey="step"
            tick={{ fill: "#94A3B8", fontSize: 11 }}
            axisLine={{ stroke: "#334155" }}
            tickLine={{ stroke: "#334155" }}
            label={{
              value: dataset.xAxisLabel,
              position: "insideBottomRight",
              offset: -4,
              fill: "#64748B",
              fontSize: 11,
            }}
          />

          <YAxis
            tickFormatter={yFormatter}
            tick={{ fill: "#94A3B8", fontSize: 11 }}
            axisLine={{ stroke: "#334155" }}
            tickLine={{ stroke: "#334155" }}
            width={60}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: "#1E293B",
              border: "1px solid #334155",
              borderRadius: 8,
              color: "#F8FAFC",
              fontSize: 12,
            }}
            itemStyle={{ color: "#F8FAFC" }}
            labelStyle={{ color: "#94A3B8", fontWeight: 600, marginBottom: 4 }}
            labelFormatter={(label: number) => `Step ${label}`}
            formatter={renderTooltipValue}
            cursor={{ stroke: "#475569", strokeWidth: 1 }}
          />

          <Legend
            wrapperStyle={{ color: "#94A3B8", fontSize: 12, paddingTop: 8 }}
            iconType="plainline"
          />

          {dataset.series.map((s: ChartSeries) => renderSeries(s))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Series renderer — maps ChartSeries metadata to the correct Recharts element
// ---------------------------------------------------------------------------

function renderSeries(series: ChartSeries) {
  const dashArray = series.dashed ? "5 5" : undefined;

  switch (series.type) {
    case "line":
      return (
        <Line
          key={series.key}
          type="monotone"
          dataKey={series.key}
          name={series.key}
          stroke={series.color}
          strokeWidth={2}
          strokeDasharray={dashArray}
          dot={false}
          activeDot={{ r: 3, strokeWidth: 0 }}
        />
      );
    case "area":
      return (
        <Area
          key={series.key}
          type="monotone"
          dataKey={series.key}
          name={series.key}
          stroke={series.color}
          strokeWidth={2}
          strokeDasharray={dashArray}
          fill={series.color}
          fillOpacity={0.15}
          dot={false}
          activeDot={{ r: 3, strokeWidth: 0 }}
        />
      );
    case "bar":
      return (
        <Bar
          key={series.key}
          dataKey={series.key}
          name={series.key}
          fill={series.color}
          opacity={0.8}
          radius={[2, 2, 0, 0]}
        />
      );
  }
}
