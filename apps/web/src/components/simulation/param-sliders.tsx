"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import type { FullSimConfig, EmissionModel } from "@zapp/simulation";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ParamSlidersProps {
  config: FullSimConfig;
  onChange: (config: FullSimConfig) => void;
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function fmtNumber(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

function fmtPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function fmtDollars(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

function fmtTokenPrice(value: number): string {
  if (value < 0.01) return `$${value.toFixed(4)}`;
  if (value < 1) return `$${value.toFixed(3)}`;
  return `$${value.toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// Slider descriptor
// ---------------------------------------------------------------------------

interface SliderDef {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  format: (v: number) => string;
  /** Reads the current value from config */
  get: (c: FullSimConfig) => number;
  /** Returns a new config with the value set */
  set: (c: FullSimConfig, v: number) => FullSimConfig;
}

interface DropdownDef {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  get: (c: FullSimConfig) => string;
  set: (c: FullSimConfig, v: string) => FullSimConfig;
}

type FieldDef =
  | ({ type: "slider" } & SliderDef)
  | ({ type: "dropdown" } & DropdownDef);

interface GroupDef {
  title: string;
  fields: FieldDef[];
}

// ---------------------------------------------------------------------------
// Helper: deep-set on stakingParams / behavior
// ---------------------------------------------------------------------------

function setStaking(
  c: FullSimConfig,
  patch: Partial<FullSimConfig["stakingParams"]>,
): FullSimConfig {
  return {
    ...c,
    stakingParams: { ...c.stakingParams, ...patch },
  };
}

function setBehavior(
  c: FullSimConfig,
  patch: Partial<FullSimConfig["behavior"]>,
): FullSimConfig {
  return {
    ...c,
    behavior: { ...c.behavior, ...patch },
  };
}

// ---------------------------------------------------------------------------
// Group definitions
// ---------------------------------------------------------------------------

function emissionRateLabel(model: EmissionModel): string {
  switch (model) {
    case "fixed-rate":
      return "Emission Rate (tokens/step)";
    case "halving":
      return "Initial Halving Rate (tokens/step)";
    case "decay":
      return "Initial Decay Rate (tokens/step)";
    case "custom-schedule":
      return "Base Emission Rate (tokens/step)";
  }
}

function getEmissionRate(c: FullSimConfig): number {
  switch (c.stakingParams.emissionModel) {
    case "fixed-rate":
      return c.stakingParams.fixedEmissionRate ?? 500;
    case "halving":
      return c.stakingParams.halvingInitialRate ?? 500;
    case "decay":
      return c.stakingParams.decayInitialRate ?? 500;
    case "custom-schedule":
      return c.stakingParams.fixedEmissionRate ?? 500;
  }
}

function setEmissionRate(c: FullSimConfig, v: number): FullSimConfig {
  const patch: Partial<FullSimConfig["stakingParams"]> = {};
  switch (c.stakingParams.emissionModel) {
    case "fixed-rate":
      patch.fixedEmissionRate = v;
      break;
    case "halving":
      patch.halvingInitialRate = v;
      break;
    case "decay":
      patch.decayInitialRate = v;
      break;
    case "custom-schedule":
      patch.fixedEmissionRate = v;
      break;
  }
  return setStaking(c, patch);
}

function buildGroups(config: FullSimConfig): GroupDef[] {
  return [
    {
      title: "TOKEN SUPPLY",
      fields: [
        {
          type: "slider",
          key: "initialTotalSupply",
          label: "Initial Total Supply",
          min: 100_000,
          max: 100_000_000,
          step: 100_000,
          defaultValue: 1_000_000,
          format: fmtNumber,
          get: (c) => c.stakingParams.initialTotalSupply,
          set: (c, v) => setStaking(c, { initialTotalSupply: v }),
        },
        {
          type: "slider",
          key: "maxSupply",
          label: "Max Supply",
          min: 1_000_000,
          max: 1_000_000_000,
          step: 1_000_000,
          defaultValue: 10_000_000,
          format: fmtNumber,
          get: (c) => c.stakingParams.maxSupply,
          set: (c, v) => setStaking(c, { maxSupply: v }),
        },
        {
          type: "slider",
          key: "initialCirculatingSupply",
          label: "Initial Circulating Supply",
          min: 10_000,
          max: config.stakingParams.maxSupply,
          step: 10_000,
          defaultValue: 500_000,
          format: fmtNumber,
          get: (c) => c.stakingParams.initialCirculatingSupply,
          set: (c, v) => setStaking(c, { initialCirculatingSupply: v }),
        },
      ],
    },
    {
      title: "EMISSIONS",
      fields: [
        {
          type: "dropdown",
          key: "emissionModel",
          label: "Emission Model",
          options: [
            { value: "fixed-rate", label: "Fixed Rate" },
            { value: "halving", label: "Halving" },
            { value: "decay", label: "Decay" },
            { value: "custom-schedule", label: "Custom Schedule" },
          ],
          get: (c) => c.stakingParams.emissionModel,
          set: (c, v) =>
            setStaking(c, { emissionModel: v as EmissionModel }),
        },
        {
          type: "slider",
          key: "emissionRate",
          label: emissionRateLabel(config.stakingParams.emissionModel),
          min: 10,
          max: 100_000,
          step: 10,
          defaultValue: 500,
          format: fmtNumber,
          get: getEmissionRate,
          set: setEmissionRate,
        },
        {
          type: "slider",
          key: "stakerEmissionShare",
          label: "Staker Emission Share",
          min: 0,
          max: 1,
          step: 0.01,
          defaultValue: 0.7,
          format: fmtPercent,
          get: (c) => c.stakingParams.stakerEmissionShare,
          set: (c, v) => setStaking(c, { stakerEmissionShare: v }),
        },
      ],
    },
    {
      title: "STAKING MECHANICS",
      fields: [
        {
          type: "slider",
          key: "lockPeriod",
          label: "Lock Period (steps)",
          min: 0,
          max: 365,
          step: 1,
          defaultValue: 7,
          format: (v) => `${v}`,
          get: (c) => c.stakingParams.lockPeriod,
          set: (c, v) => setStaking(c, { lockPeriod: v }),
        },
        {
          type: "slider",
          key: "earlyUnstakePenalty",
          label: "Early Unstake Penalty",
          min: 0,
          max: 0.5,
          step: 0.01,
          defaultValue: 0.1,
          format: fmtPercent,
          get: (c) => c.stakingParams.earlyUnstakePenalty,
          set: (c, v) => setStaking(c, { earlyUnstakePenalty: v }),
        },
        {
          type: "slider",
          key: "compoundingRate",
          label: "Compounding Rate",
          min: 0,
          max: 1,
          step: 0.05,
          defaultValue: 0.5,
          format: fmtPercent,
          get: (c) => c.stakingParams.compoundingRate,
          set: (c, v) => setStaking(c, { compoundingRate: v }),
        },
      ],
    },
    {
      title: "FEES & TREASURY",
      fields: [
        {
          type: "slider",
          key: "feeRate",
          label: "Fee Rate",
          min: 0,
          max: 0.2,
          step: 0.005,
          defaultValue: 0.03,
          format: fmtPercent,
          get: (c) => c.stakingParams.feeRate,
          set: (c, v) => setStaking(c, { feeRate: v }),
        },
        {
          type: "slider",
          key: "estimatedVolumePerStep",
          label: "Estimated Volume/Step",
          min: 1_000,
          max: 10_000_000,
          step: 10_000,
          defaultValue: 500_000,
          format: fmtDollars,
          get: (c) => c.stakingParams.estimatedVolumePerStep,
          set: (c, v) => setStaking(c, { estimatedVolumePerStep: v }),
        },
        {
          type: "slider",
          key: "initialTreasuryBalance",
          label: "Initial Treasury",
          min: 0,
          max: 10_000_000,
          step: 10_000,
          defaultValue: 100_000,
          format: (v) => `${fmtNumber(v)} tokens`,
          get: (c) => c.stakingParams.initialTreasuryBalance,
          set: (c, v) => setStaking(c, { initialTreasuryBalance: v }),
        },
      ],
    },
    {
      title: "PRICE MODEL",
      fields: [
        {
          type: "slider",
          key: "initialTokenPrice",
          label: "Initial Token Price",
          min: 0.001,
          max: 1000,
          step: 0.01,
          defaultValue: 1.0,
          format: fmtTokenPrice,
          get: (c) => c.stakingParams.initialTokenPrice,
          set: (c, v) => setStaking(c, { initialTokenPrice: v }),
        },
        {
          type: "slider",
          key: "priceElasticity",
          label: "Price Elasticity",
          min: 0.1,
          max: 10,
          step: 0.1,
          defaultValue: 2.0,
          format: (v) => v.toFixed(1),
          get: (c) => c.stakingParams.priceElasticity,
          set: (c, v) => setStaking(c, { priceElasticity: v }),
        },
        {
          type: "slider",
          key: "externalBuyPressure",
          label: "External Buy Pressure",
          min: 0,
          max: 100_000,
          step: 500,
          defaultValue: 5_000,
          format: (v) => `${fmtDollars(v)}/step`,
          get: (c) => c.stakingParams.externalBuyPressure,
          set: (c, v) => setStaking(c, { externalBuyPressure: v }),
        },
      ],
    },
    {
      title: "USER BEHAVIOR",
      fields: [
        {
          type: "slider",
          key: "initialUsers",
          label: "Initial Users",
          min: 1,
          max: 10_000,
          step: 10,
          defaultValue: 100,
          format: (v) => fmtNumber(v),
          get: (c) => c.behavior.initialUsers,
          set: (c, v) => setBehavior(c, { initialUsers: v }),
        },
        {
          type: "slider",
          key: "baseEntryRate",
          label: "Base Entry Rate (users/step)",
          min: 0,
          max: 100,
          step: 1,
          defaultValue: 5,
          format: (v) => `${v}`,
          get: (c) => c.behavior.baseEntryRate,
          set: (c, v) => setBehavior(c, { baseEntryRate: v }),
        },
        {
          type: "slider",
          key: "returnSensitivity",
          label: "Return Sensitivity",
          min: 0,
          max: 2,
          step: 0.1,
          defaultValue: 0.8,
          format: (v) => v.toFixed(1),
          get: (c) => c.behavior.returnSensitivity,
          set: (c, v) => setBehavior(c, { returnSensitivity: v }),
        },
        {
          type: "slider",
          key: "maxExitRate",
          label: "Max Exit Rate",
          min: 0,
          max: 1,
          step: 0.05,
          defaultValue: 0.3,
          format: fmtPercent,
          get: (c) => c.behavior.maxExitRate,
          set: (c, v) => setBehavior(c, { maxExitRate: v }),
        },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// Debounce hook
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function useDebouncedCallback<T extends (...args: any[]) => void>(
  callback: T,
  delayMs: number,
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    };
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return useCallback(
    (...args: any[]) => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delayMs);
    },
    [delayMs],
  ) as T;
}

// ---------------------------------------------------------------------------
// SliderRow component
// ---------------------------------------------------------------------------

function SliderRow({
  def,
  config,
  onChange,
  disabled,
}: {
  def: SliderDef;
  config: FullSimConfig;
  onChange: (c: FullSimConfig) => void;
  disabled?: boolean;
}) {
  const value = def.get(config);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <label className="text-sm text-slate-300" htmlFor={def.key}>
          {def.label}
        </label>
        <span className="text-sm font-mono text-slate-100 tabular-nums">
          {def.format(value)}
        </span>
      </div>
      <input
        id={def.key}
        type="range"
        min={def.min}
        max={def.max}
        step={def.step}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          const next = def.set(config, parseFloat(e.target.value));
          onChange(next);
        }}
        className="w-full h-2 rounded-full appearance-none cursor-pointer
                   bg-slate-700
                   [&::-webkit-slider-thumb]:appearance-none
                   [&::-webkit-slider-thumb]:h-4
                   [&::-webkit-slider-thumb]:w-4
                   [&::-webkit-slider-thumb]:rounded-full
                   [&::-webkit-slider-thumb]:bg-indigo-500
                   [&::-webkit-slider-thumb]:shadow-md
                   [&::-webkit-slider-thumb]:hover:bg-indigo-400
                   [&::-moz-range-thumb]:h-4
                   [&::-moz-range-thumb]:w-4
                   [&::-moz-range-thumb]:rounded-full
                   [&::-moz-range-thumb]:bg-indigo-500
                   [&::-moz-range-thumb]:border-0
                   [&::-moz-range-thumb]:shadow-md
                   [&::-moz-range-thumb]:hover:bg-indigo-400
                   disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// DropdownRow component
// ---------------------------------------------------------------------------

function DropdownRow({
  def,
  config,
  onChange,
  disabled,
}: {
  def: DropdownDef;
  config: FullSimConfig;
  onChange: (c: FullSimConfig) => void;
  disabled?: boolean;
}) {
  const value = def.get(config);

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm text-slate-300" htmlFor={def.key}>
        {def.label}
      </label>
      <select
        id={def.key}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          const next = def.set(config, e.target.value);
          onChange(next);
        }}
        className="w-full h-9 px-3 rounded-md text-sm
                   bg-slate-800 border border-slate-600 text-slate-100
                   focus:outline-none focus:ring-2 focus:ring-indigo-500
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {def.options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ParamSliders
// ---------------------------------------------------------------------------

export function ParamSliders({ config, onChange, disabled }: ParamSlidersProps) {
  const [localConfig, setLocalConfig] = useState(config);

  // Sync incoming config when it changes externally
  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const debouncedOnChange = useDebouncedCallback(
    (nextConfig: FullSimConfig) => {
      onChange(nextConfig);
    },
    100,
  );

  const handleChange = useCallback(
    (next: FullSimConfig) => {
      setLocalConfig(next);
      debouncedOnChange(next);
    },
    [debouncedOnChange],
  );

  const groups = buildGroups(localConfig);

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <div key={group.title} className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
            {group.title}
          </h3>
          <div className="flex flex-col gap-4">
            {group.fields.map((field) => {
              if (field.type === "slider") {
                return (
                  <SliderRow
                    key={field.key}
                    def={field}
                    config={localConfig}
                    onChange={handleChange}
                    disabled={disabled}
                  />
                );
              }
              return (
                <DropdownRow
                  key={field.key}
                  def={field}
                  config={localConfig}
                  onChange={handleChange}
                  disabled={disabled}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
