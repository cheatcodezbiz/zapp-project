"use client";

import { useState, useCallback, useMemo } from "react";
import type { FullSimConfig, ChartDataSet, RiskReport } from "@zapp/simulation";
import type { RiskClassification } from "@zapp/shared-types";
import { useSimulation, createDefaultConfig } from "@/hooks/use-simulation";

// ============================================================================
// Page Component
// ============================================================================

export default function SimulatePage() {
  const [config, setConfig] = useState<FullSimConfig>(createDefaultConfig);
  const [reportExpanded, setReportExpanded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const sim = useSimulation();

  const handleRun = useCallback(() => {
    const runConfig: FullSimConfig = {
      ...config,
      id: "sim-" + Date.now(),
      seed: config.seed ?? Math.floor(Math.random() * 100_000),
    };
    setConfig(runConfig);
    sim.run(runConfig);
  }, [config, sim]);

  const handleConfigChange = useCallback(
    (patch: Partial<FullSimConfig>) => {
      setConfig((prev) => ({ ...prev, ...patch }));
    },
    [],
  );

  return (
    <div className="flex h-full">
      {/* ── Left Sidebar: Parameter Sliders ──────────────────────────── */}
      {sidebarOpen && (
        <aside className="w-[360px] shrink-0 overflow-y-auto border-r border-border bg-slate-900/60 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Parameters
            </h2>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              title="Collapse panel"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>
          <ParamSliders config={config} onChange={handleConfigChange} />
        </aside>
      )}

      {/* ── Main Content ─────────────────────────────────────────────── */}
      <main className="flex flex-1 flex-col overflow-y-auto p-6">
        {/* Header row */}
        <div className="mb-1 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                title="Expand parameters"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            )}
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Simulation Dashboard
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Configure parameters and run a simulation to visualize protocol
                economics
              </p>
            </div>
          </div>
          {sim.risk && (
            <RiskBadge
              level={sim.risk.level}
              feeCoverage={sim.risk.feeCoveragePercent}
              onClick={() => setReportExpanded((prev) => !prev)}
            />
          )}
        </div>

        {/* Controls bar */}
        <SimControls
          running={sim.running}
          durationMs={sim.durationMs}
          timeSteps={config.timeSteps}
          onRun={handleRun}
          onTimeStepsChange={(n) => handleConfigChange({ timeSteps: n })}
        />

        {/* Error display */}
        {sim.error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {sim.error}
          </div>
        )}

        {/* Charts 2x2 grid */}
        {sim.charts.length > 0 ? (
          <ChartGrid charts={sim.charts} />
        ) : (
          <EmptyState />
        )}

        {/* Expanded Risk Report */}
        {reportExpanded && sim.report && sim.risk && (
          <RiskReportPanel report={sim.report} risk={sim.risk} />
        )}

        {/* Footer */}
        <footer className="mt-auto border-t border-border pt-4 text-center text-xs text-muted-foreground">
          &copy; 2026 Zapp — Protocol Simulation Engine
        </footer>
      </main>
    </div>
  );
}

// ============================================================================
// EmptyState -- shown before the first simulation run
// ============================================================================

function EmptyState() {
  return (
    <div className="mt-12 flex flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <svg
          className="h-8 w-8 text-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-1.5L12 12"
          />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-foreground">
        No simulation yet
      </h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Adjust the parameters on the left, then click{" "}
        <span className="font-medium text-primary">Run Simulation</span> to
        visualize your protocol economics.
      </p>
    </div>
  );
}

// ============================================================================
// ParamSliders -- Sidebar parameter controls
// ============================================================================

interface ParamSlidersProps {
  config: FullSimConfig;
  onChange: (patch: Partial<FullSimConfig>) => void;
}

function ParamSliders({ config, onChange }: ParamSlidersProps) {
  const { stakingParams, behavior, scenario } = config;

  const patchStaking = useCallback(
    (patch: Partial<FullSimConfig["stakingParams"]>) => {
      onChange({ stakingParams: { ...config.stakingParams, ...patch } });
    },
    [onChange, config.stakingParams],
  );

  const patchBehavior = useCallback(
    (patch: Partial<FullSimConfig["behavior"]>) => {
      onChange({ behavior: { ...config.behavior, ...patch } });
    },
    [onChange, config.behavior],
  );

  const patchScenario = useCallback(
    (patch: Partial<FullSimConfig["scenario"]>) => {
      onChange({ scenario: { ...config.scenario, ...patch } });
    },
    [onChange, config.scenario],
  );

  return (
    <div className="space-y-5">
      {/* -- Supply -- */}
      <SliderSection title="Token Supply">
        <SliderField
          label="Initial Total Supply"
          value={stakingParams.initialTotalSupply}
          min={1_000_000}
          max={10_000_000_000}
          step={10_000_000}
          format="token"
          onChange={(v) => patchStaking({ initialTotalSupply: v })}
        />
        <SliderField
          label="Max Supply"
          value={stakingParams.maxSupply}
          min={stakingParams.initialTotalSupply}
          max={20_000_000_000}
          step={10_000_000}
          format="token"
          onChange={(v) => patchStaking({ maxSupply: v })}
        />
        <SliderField
          label="Circulating Supply"
          value={stakingParams.initialCirculatingSupply}
          min={0}
          max={stakingParams.initialTotalSupply}
          step={1_000_000}
          format="token"
          onChange={(v) => patchStaking({ initialCirculatingSupply: v })}
        />
      </SliderSection>

      {/* -- Emissions -- */}
      <SliderSection title="Emissions">
        <SelectField
          label="Emission Model"
          value={stakingParams.emissionModel}
          options={[
            { value: "fixed-rate", label: "Fixed Rate" },
            { value: "halving", label: "Halving" },
            { value: "decay", label: "Exponential Decay" },
          ]}
          onChange={(v) =>
            patchStaking({
              emissionModel: v as FullSimConfig["stakingParams"]["emissionModel"],
            })
          }
        />
        {stakingParams.emissionModel === "fixed-rate" && (
          <SliderField
            label="Fixed Emission Rate"
            value={stakingParams.fixedEmissionRate ?? 100_000}
            min={0}
            max={5_000_000}
            step={10_000}
            format="token"
            onChange={(v) => patchStaking({ fixedEmissionRate: v })}
          />
        )}
        {stakingParams.emissionModel === "halving" && (
          <>
            <SliderField
              label="Initial Emission Rate"
              value={stakingParams.halvingInitialRate ?? 500_000}
              min={10_000}
              max={5_000_000}
              step={10_000}
              format="token"
              onChange={(v) => patchStaking({ halvingInitialRate: v })}
            />
            <SliderField
              label="Halving Interval (steps)"
              value={stakingParams.halvingInterval ?? 365}
              min={30}
              max={1460}
              step={30}
              format="number"
              onChange={(v) => patchStaking({ halvingInterval: v })}
            />
          </>
        )}
        {stakingParams.emissionModel === "decay" && (
          <>
            <SliderField
              label="Initial Emission Rate"
              value={stakingParams.decayInitialRate ?? 500_000}
              min={10_000}
              max={5_000_000}
              step={10_000}
              format="token"
              onChange={(v) => patchStaking({ decayInitialRate: v })}
            />
            <SliderField
              label="Decay Constant"
              value={stakingParams.decayConstant ?? 0.01}
              min={0.001}
              max={0.1}
              step={0.001}
              format="decimal"
              onChange={(v) => patchStaking({ decayConstant: v })}
            />
          </>
        )}
        <SliderField
          label="Staker Emission Share"
          value={stakingParams.stakerEmissionShare}
          min={0}
          max={1}
          step={0.05}
          format="percent"
          onChange={(v) => patchStaking({ stakerEmissionShare: v })}
        />
      </SliderSection>

      {/* -- Staking Mechanics -- */}
      <SliderSection title="Staking Mechanics">
        <SliderField
          label="Lock Period (steps)"
          value={stakingParams.lockPeriod}
          min={1}
          max={365}
          step={1}
          format="number"
          onChange={(v) => patchStaking({ lockPeriod: v })}
        />
        <SliderField
          label="Early Unstake Penalty"
          value={stakingParams.earlyUnstakePenalty}
          min={0}
          max={0.5}
          step={0.01}
          format="percent"
          onChange={(v) => patchStaking({ earlyUnstakePenalty: v })}
        />
        <SliderField
          label="Compounding Rate"
          value={stakingParams.compoundingRate}
          min={0}
          max={1}
          step={0.05}
          format="percent"
          onChange={(v) => patchStaking({ compoundingRate: v })}
        />
      </SliderSection>

      {/* -- Treasury & Fees -- */}
      <SliderSection title="Treasury & Fees">
        <SliderField
          label="Initial Treasury"
          value={stakingParams.initialTreasuryBalance}
          min={0}
          max={500_000_000}
          step={1_000_000}
          format="token"
          onChange={(v) => patchStaking({ initialTreasuryBalance: v })}
        />
        <SliderField
          label="Fee Rate"
          value={stakingParams.feeRate}
          min={0}
          max={0.05}
          step={0.0005}
          format="percent"
          onChange={(v) => patchStaking({ feeRate: v })}
        />
        <SliderField
          label="Est. Volume / Step (USD)"
          value={stakingParams.estimatedVolumePerStep}
          min={0}
          max={100_000_000}
          step={100_000}
          format="usd"
          onChange={(v) => patchStaking({ estimatedVolumePerStep: v })}
        />
      </SliderSection>

      {/* -- Price -- */}
      <SliderSection title="Token Price">
        <SliderField
          label="Initial Price (USD)"
          value={stakingParams.initialTokenPrice}
          min={0.001}
          max={100}
          step={0.01}
          format="usd"
          onChange={(v) => patchStaking({ initialTokenPrice: v })}
        />
        <SliderField
          label="Price Elasticity"
          value={stakingParams.priceElasticity}
          min={1}
          max={100}
          step={1}
          format="number"
          onChange={(v) => patchStaking({ priceElasticity: v })}
        />
        <SliderField
          label="External Buy Pressure (USD)"
          value={stakingParams.externalBuyPressure}
          min={0}
          max={1_000_000}
          step={5_000}
          format="usd"
          onChange={(v) => patchStaking({ externalBuyPressure: v })}
        />
      </SliderSection>

      {/* -- User Behavior -- */}
      <SliderSection title="User Behavior">
        <SliderField
          label="Initial Users"
          value={behavior.initialUsers}
          min={10}
          max={100_000}
          step={10}
          format="number"
          onChange={(v) => patchBehavior({ initialUsers: v })}
        />
        <SliderField
          label="Avg Stake Amount"
          value={behavior.avgStakeAmount}
          min={100}
          max={100_000}
          step={100}
          format="token"
          onChange={(v) => patchBehavior({ avgStakeAmount: v })}
        />
        <SelectField
          label="Entry Model"
          value={behavior.entryModel}
          options={[
            { value: "constant", label: "Constant" },
            { value: "linear-growth", label: "Linear Growth" },
            { value: "exponential-decay", label: "Exponential Decay" },
            { value: "s-curve", label: "S-Curve" },
          ]}
          onChange={(v) =>
            patchBehavior({
              entryModel: v as FullSimConfig["behavior"]["entryModel"],
            })
          }
        />
        <SliderField
          label="Base Entry Rate (users/step)"
          value={behavior.baseEntryRate}
          min={0}
          max={500}
          step={1}
          format="number"
          onChange={(v) => patchBehavior({ baseEntryRate: v })}
        />
        <SliderField
          label="Return Sensitivity"
          value={behavior.returnSensitivity}
          min={0}
          max={3}
          step={0.1}
          format="decimal"
          onChange={(v) => patchBehavior({ returnSensitivity: v })}
        />
        <SliderField
          label="Max Exit Rate"
          value={behavior.maxExitRate}
          min={0.01}
          max={0.5}
          step={0.01}
          format="percent"
          onChange={(v) => patchBehavior({ maxExitRate: v })}
        />
      </SliderSection>

      {/* -- Scenario -- */}
      <SliderSection title="Market Scenario">
        <SliderField
          label="Market Sentiment"
          value={scenario.marketSentiment}
          min={0.1}
          max={3.0}
          step={0.1}
          format="decimal"
          onChange={(v) => patchScenario({ marketSentiment: v })}
        />
      </SliderSection>

      {/* -- Seed -- */}
      <SliderSection title="Randomness">
        <SliderField
          label="PRNG Seed"
          value={config.seed ?? 42}
          min={0}
          max={99999}
          step={1}
          format="number"
          onChange={(v) => onChange({ seed: v })}
        />
      </SliderSection>
    </div>
  );
}

// ============================================================================
// SliderSection -- Collapsible group
// ============================================================================

function SliderSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button
        type="button"
        className="flex w-full items-center justify-between py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
        onClick={() => setOpen((p) => !p)}
      >
        {title}
        <svg
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-0" : "-rotate-90"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {open && <div className="mt-2 space-y-3">{children}</div>}
    </div>
  );
}

// ============================================================================
// SliderField -- Individual parameter slider
// ============================================================================

type FormatType = "number" | "usd" | "percent" | "token" | "decimal";

function formatValue(value: number, format: FormatType): string {
  switch (format) {
    case "usd":
      return value >= 1_000_000
        ? `$${(value / 1_000_000).toFixed(1)}M`
        : value >= 1_000
          ? `$${(value / 1_000).toFixed(1)}K`
          : `$${value.toFixed(2)}`;
    case "percent":
      return `${(value * 100).toFixed(1)}%`;
    case "token":
      return value >= 1_000_000_000
        ? `${(value / 1_000_000_000).toFixed(2)}B`
        : value >= 1_000_000
          ? `${(value / 1_000_000).toFixed(1)}M`
          : value >= 1_000
            ? `${(value / 1_000).toFixed(1)}K`
            : value.toFixed(0);
    case "decimal":
      return value.toFixed(3);
    case "number":
    default:
      return value >= 1_000_000
        ? `${(value / 1_000_000).toFixed(1)}M`
        : value >= 1_000
          ? `${(value / 1_000).toFixed(1)}K`
          : value.toFixed(0);
  }
}

interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: FormatType;
  onChange: (v: number) => void;
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: SliderFieldProps) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-xs text-muted-foreground">{label}</label>
        <span className="font-mono text-xs text-foreground">
          {formatValue(value, format)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
      />
    </div>
  );
}

// ============================================================================
// SelectField -- Dropdown parameter
// ============================================================================

interface SelectFieldProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}

function SelectField({ label, value, options, onChange }: SelectFieldProps) {
  return (
    <div>
      <label className="mb-1 block text-xs text-muted-foreground">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border bg-secondary px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ============================================================================
// RiskBadge -- Colored risk indicator
// ============================================================================

interface RiskBadgeProps {
  level: "sustainable" | "caution" | "unsustainable";
  feeCoverage: number;
  onClick: () => void;
}

const RISK_STYLES = {
  sustainable: {
    bg: "bg-green-500/15",
    border: "border-green-500/30",
    text: "text-green-400",
    dot: "bg-green-400",
    label: "Sustainable",
  },
  caution: {
    bg: "bg-yellow-500/15",
    border: "border-yellow-500/30",
    text: "text-yellow-400",
    dot: "bg-yellow-400",
    label: "Caution",
  },
  unsustainable: {
    bg: "bg-red-500/15",
    border: "border-red-500/30",
    text: "text-red-400",
    dot: "bg-red-400",
    label: "Unsustainable",
  },
};

function RiskBadge({ level, feeCoverage, onClick }: RiskBadgeProps) {
  const s = RISK_STYLES[level];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 items-center gap-2 rounded-lg border px-4 py-2 transition-colors hover:brightness-110 ${s.bg} ${s.border}`}
    >
      <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
      <span className={`text-sm font-semibold ${s.text}`}>{s.label}</span>
      <span className="text-xs text-muted-foreground">
        {feeCoverage}% fee coverage
      </span>
    </button>
  );
}

// ============================================================================
// SimControls -- Run button + time steps control
// ============================================================================

interface SimControlsProps {
  running: boolean;
  durationMs: number | null;
  timeSteps: number;
  onRun: () => void;
  onTimeStepsChange: (n: number) => void;
}

function SimControls({
  running,
  durationMs,
  timeSteps,
  onRun,
  onTimeStepsChange,
}: SimControlsProps) {
  return (
    <div className="my-4 flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3">
      <button
        type="button"
        onClick={onRun}
        disabled={running}
        className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {running ? (
          <>
            <SpinnerIcon />
            Running...
          </>
        ) : (
          <>
            <PlayIcon />
            Run Simulation
          </>
        )}
      </button>

      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground">Steps:</label>
        <select
          value={timeSteps}
          onChange={(e) => onTimeStepsChange(parseInt(e.target.value, 10))}
          className="rounded-md border border-border bg-secondary px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value={30}>30</option>
          <option value={90}>90</option>
          <option value={180}>180</option>
          <option value={365}>365</option>
        </select>
      </div>

      {durationMs !== null && (
        <span className="ml-auto text-xs text-muted-foreground">
          Completed in {durationMs.toFixed(1)}ms
        </span>
      )}
    </div>
  );
}

function PlayIcon() {
  return (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// ============================================================================
// ChartGrid -- 2x2 chart layout using SVG (zero external dependencies)
// ============================================================================

interface ChartGridProps {
  charts: ChartDataSet[];
}

function ChartGrid({ charts }: ChartGridProps) {
  return (
    <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
      {charts.map((chart) => (
        <ChartCard key={chart.id} chart={chart} />
      ))}
    </div>
  );
}

// ============================================================================
// ChartCard -- Individual chart rendered as pure SVG
// ============================================================================

const CHART_W = 520;
const CHART_H = 260;
const PAD = { top: 20, right: 20, bottom: 30, left: 60 };
const PLOT_W = CHART_W - PAD.left - PAD.right;
const PLOT_H = CHART_H - PAD.top - PAD.bottom;

function ChartCard({ chart }: { chart: ChartDataSet }) {
  const { series, data, title, yAxisFormat } = chart;

  const { xMin, xMax, yMin, yMax } = useMemo(() => {
    let yLo = Infinity;
    let yHi = -Infinity;

    for (const pt of data) {
      for (const s of series) {
        const v = pt[s.key];
        if (typeof v === "number" && isFinite(v)) {
          if (v < yLo) yLo = v;
          if (v > yHi) yHi = v;
        }
      }
    }

    const yRange = yHi - yLo || 1;
    yLo = yLo - yRange * 0.05;
    yHi = yHi + yRange * 0.1;

    return {
      xMin: data.length > 0 ? data[0]!.step : 0,
      xMax: data.length > 0 ? data[data.length - 1]!.step : 1,
      yMin: yLo,
      yMax: yHi,
    };
  }, [data, series]);

  const scaleX = useCallback(
    (step: number) => {
      const range = xMax - xMin || 1;
      return PAD.left + ((step - xMin) / range) * PLOT_W;
    },
    [xMin, xMax],
  );

  const scaleY = useCallback(
    (val: number) => {
      const range = yMax - yMin || 1;
      return PAD.top + PLOT_H - ((val - yMin) / range) * PLOT_H;
    },
    [yMin, yMax],
  );

  const formatTick = useCallback(
    (v: number): string => {
      switch (yAxisFormat) {
        case "usd":
          return v >= 1_000_000
            ? `$${(v / 1_000_000).toFixed(1)}M`
            : v >= 1_000
              ? `$${(v / 1_000).toFixed(0)}K`
              : `$${v.toFixed(2)}`;
        case "percent":
          return `${(v * 100).toFixed(0)}%`;
        case "token":
          return v >= 1_000_000
            ? `${(v / 1_000_000).toFixed(1)}M`
            : v >= 1_000
              ? `${(v / 1_000).toFixed(0)}K`
              : v.toFixed(0);
        case "number":
        default:
          return v >= 1_000_000
            ? `${(v / 1_000_000).toFixed(1)}M`
            : v >= 1_000
              ? `${(v / 1_000).toFixed(0)}K`
              : v.toFixed(1);
      }
    },
    [yAxisFormat],
  );

  const yTicks = useMemo(() => {
    const count = 5;
    const ticks: number[] = [];
    const range = yMax - yMin;
    for (let i = 0; i <= count; i++) {
      ticks.push(yMin + (range * i) / count);
    }
    return ticks;
  }, [yMin, yMax]);

  const xTicks = useMemo(() => {
    const count = Math.min(6, data.length);
    if (count <= 1) return data.map((d) => d.step);
    const ticks: number[] = [];
    for (let i = 0; i < count; i++) {
      const idx = Math.round((i / (count - 1)) * (data.length - 1));
      ticks.push(data[idx]!.step);
    }
    return ticks;
  }, [data]);

  const paths = useMemo(() => {
    return series.map((s) => {
      let linePath = "";
      const validPoints: { x: number; y: number }[] = [];

      for (const pt of data) {
        const v = pt[s.key];
        if (typeof v !== "number" || !isFinite(v)) continue;
        const x = scaleX(pt.step);
        const y = scaleY(v);
        validPoints.push({ x, y });
        linePath += validPoints.length === 1 ? `M${x},${y}` : `L${x},${y}`;
      }

      let areaPath = "";
      if (s.type === "area" && validPoints.length > 1) {
        const baseline = scaleY(Math.max(yMin, 0));
        areaPath = linePath;
        areaPath += `L${validPoints[validPoints.length - 1]!.x},${baseline}`;
        areaPath += `L${validPoints[0]!.x},${baseline}Z`;
      }

      return { ...s, linePath, areaPath, validPoints };
    });
  }, [series, data, scaleX, scaleY, yMin]);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-2 text-sm font-semibold text-foreground">{title}</h3>
      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grid lines */}
        {yTicks.map((tick, i) => (
          <line
            key={`gy-${i}`}
            x1={PAD.left}
            x2={CHART_W - PAD.right}
            y1={scaleY(tick)}
            y2={scaleY(tick)}
            stroke="hsl(217.2 32.6% 17.5%)"
            strokeWidth={0.5}
          />
        ))}

        {/* Y-axis labels */}
        {yTicks.map((tick, i) => (
          <text
            key={`ly-${i}`}
            x={PAD.left - 6}
            y={scaleY(tick)}
            textAnchor="end"
            dominantBaseline="middle"
            fill="hsl(215 20.2% 65.1%)"
            fontSize={9}
            fontFamily="var(--font-mono), monospace"
          >
            {formatTick(tick)}
          </text>
        ))}

        {/* X-axis labels */}
        {xTicks.map((tick, i) => (
          <text
            key={`lx-${i}`}
            x={scaleX(tick)}
            y={CHART_H - 6}
            textAnchor="middle"
            fill="hsl(215 20.2% 65.1%)"
            fontSize={9}
            fontFamily="var(--font-mono), monospace"
          >
            {tick}
          </text>
        ))}

        {/* Series (area fill first, then lines on top) */}
        {paths.map(
          (p) =>
            p.areaPath && (
              <path key={`a-${p.key}`} d={p.areaPath} fill={p.color} opacity={0.15} />
            ),
        )}
        {paths.map((p) => (
          <path
            key={`l-${p.key}`}
            d={p.linePath}
            fill="none"
            stroke={p.color}
            strokeWidth={1.5}
            strokeDasharray={p.dashed ? "4 2" : undefined}
          />
        ))}

        {/* Axes */}
        <line
          x1={PAD.left}
          x2={PAD.left}
          y1={PAD.top}
          y2={CHART_H - PAD.bottom}
          stroke="hsl(217.2 32.6% 17.5%)"
          strokeWidth={1}
        />
        <line
          x1={PAD.left}
          x2={CHART_W - PAD.right}
          y1={CHART_H - PAD.bottom}
          y2={CHART_H - PAD.bottom}
          stroke="hsl(217.2 32.6% 17.5%)"
          strokeWidth={1}
        />
      </svg>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap gap-3">
        {series.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-3 rounded-sm"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-[10px] text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// RiskReportPanel -- Expanded risk analysis
// ============================================================================

interface RiskReportPanelProps {
  report: RiskReport;
  risk: RiskClassification;
}

function RiskReportPanel({ report, risk }: RiskReportPanelProps) {
  const severityColor = {
    critical: "border-red-500/40 bg-red-500/5 text-red-400",
    warning: "border-yellow-500/40 bg-yellow-500/5 text-yellow-400",
    info: "border-blue-500/40 bg-blue-500/5 text-blue-400",
  };

  const severityDot = {
    critical: "bg-red-400",
    warning: "bg-yellow-400",
    info: "bg-blue-400",
  };

  return (
    <div className="mt-6 space-y-4 rounded-lg border border-border bg-card p-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">Risk Analysis</h2>
        <p className="mt-1 text-sm font-medium text-primary">
          {report.headline}
        </p>
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">
        {report.summary}
      </p>

      {/* Findings */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Findings
        </h3>
        {report.findings.map((finding, idx) => (
          <div
            key={idx}
            className={`rounded-md border px-4 py-3 ${severityColor[finding.severity]}`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${severityDot[finding.severity]}`}
              />
              <span className="text-sm font-semibold">{finding.title}</span>
              <span className="ml-auto rounded-full bg-white/5 px-2 py-0.5 text-[10px] uppercase">
                {finding.category}
              </span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed opacity-80">
              {finding.explanation}
            </p>
          </div>
        ))}
      </div>

      {/* Winners & Losers */}
      <div className="rounded-md border border-border bg-secondary/30 p-4">
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Winners & Losers
        </h3>
        <p className="text-sm leading-relaxed text-foreground">
          {report.winnersLosers}
        </p>
      </div>

      {/* Risk factors from classification */}
      {risk.factors.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Risk Factors
          </h3>
          <ul className="space-y-1">
            {risk.factors.map((f, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <span
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                    f.severity === "high"
                      ? "bg-red-400"
                      : f.severity === "medium"
                        ? "bg-yellow-400"
                        : "bg-green-400"
                  }`}
                />
                <div>
                  <span className="font-medium text-foreground">{f.label}</span>
                  <span className="text-muted-foreground">
                    {" -- "}
                    {f.description}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
