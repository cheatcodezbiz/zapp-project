"use client";

import { useState, useCallback } from "react";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SimControlsProps {
  onRun: (timeSteps: number, timeStepUnit: string) => void;
  running: boolean;
  durationMs: number | null;
}

// ---------------------------------------------------------------------------
// Time step unit options
// ---------------------------------------------------------------------------

const TIME_STEP_UNITS = [
  { value: "1h", label: "1 hour" },
  { value: "6h", label: "6 hours" },
  { value: "1d", label: "1 day" },
  { value: "1w", label: "1 week" },
] as const;

// ---------------------------------------------------------------------------
// Spinner SVG
// ---------------------------------------------------------------------------

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4 text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
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
        d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647Z"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// SimControls
// ---------------------------------------------------------------------------

export function SimControls({ onRun, running, durationMs }: SimControlsProps) {
  const [timeSteps, setTimeSteps] = useState(90);
  const [timeStepUnit, setTimeStepUnit] = useState("1d");

  const handleRun = useCallback(() => {
    if (!running) {
      onRun(timeSteps, timeStepUnit);
    }
  }, [onRun, running, timeSteps, timeStepUnit]);

  return (
    <div className="flex items-center gap-4 flex-wrap">
      {/* Run button */}
      <button
        type="button"
        onClick={handleRun}
        disabled={running}
        className="
          inline-flex items-center gap-2 px-5 py-2 rounded-md
          text-sm font-medium text-white
          bg-indigo-500 hover:bg-indigo-400
          transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-indigo-500
          focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
          focus:ring-offset-slate-900
        "
      >
        {running ? (
          <>
            <Spinner />
            Running...
          </>
        ) : (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path d="M6.3 2.84A1.5 1.5 0 0 0 4 4.11v11.78a1.5 1.5 0 0 0 2.3 1.27l9.344-5.891a1.5 1.5 0 0 0 0-2.538L6.3 2.841Z" />
            </svg>
            Run Simulation
          </>
        )}
      </button>

      {/* Time steps input */}
      <div className="flex items-center gap-2">
        <label
          htmlFor="sim-time-steps"
          className="text-sm text-slate-400 whitespace-nowrap"
        >
          Steps
        </label>
        <input
          id="sim-time-steps"
          type="number"
          min={1}
          max={10000}
          value={timeSteps}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val) && val > 0) setTimeSteps(val);
          }}
          disabled={running}
          className="
            w-20 h-9 px-3 rounded-md text-sm font-mono tabular-nums
            bg-slate-800 border border-slate-600 text-slate-100
            focus:outline-none focus:ring-2 focus:ring-indigo-500
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        />
      </div>

      {/* Time step unit dropdown */}
      <div className="flex items-center gap-2">
        <label
          htmlFor="sim-time-step-unit"
          className="text-sm text-slate-400 whitespace-nowrap"
        >
          Unit
        </label>
        <select
          id="sim-time-step-unit"
          value={timeStepUnit}
          onChange={(e) => setTimeStepUnit(e.target.value)}
          disabled={running}
          className="
            h-9 px-3 rounded-md text-sm
            bg-slate-800 border border-slate-600 text-slate-100
            focus:outline-none focus:ring-2 focus:ring-indigo-500
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {TIME_STEP_UNITS.map((unit) => (
            <option key={unit.value} value={unit.value}>
              {unit.label}
            </option>
          ))}
        </select>
      </div>

      {/* Duration display */}
      {durationMs !== null && !running && (
        <span className="text-sm text-slate-500">
          Completed in {durationMs < 1000 ? `${durationMs}ms` : `${(durationMs / 1000).toFixed(1)}s`}
        </span>
      )}
    </div>
  );
}
