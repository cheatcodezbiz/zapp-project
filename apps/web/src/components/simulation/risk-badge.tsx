"use client";

import { useState } from "react";
import type { RiskClassification } from "@zapp/shared-types";
import type { RiskReport, RiskFinding } from "@zapp/simulation";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RiskBadgeProps {
  risk: RiskClassification | null;
  report: RiskReport | null;
  loading?: boolean;
}

// ---------------------------------------------------------------------------
// Severity styling maps
// ---------------------------------------------------------------------------

const LEVEL_STYLES: Record<
  RiskClassification["level"],
  { bg: string; text: string; icon: JSX.Element }
> = {
  sustainable: {
    bg: "bg-emerald-500/20 border-emerald-500/30",
    text: "text-emerald-400",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-4 h-4"
      >
        <path
          fillRule="evenodd"
          d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  caution: {
    bg: "bg-amber-500/20 border-amber-500/30",
    text: "text-amber-400",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-4 h-4"
      >
        <path
          fillRule="evenodd"
          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  unsustainable: {
    bg: "bg-red-500/20 border-red-500/30",
    text: "text-red-400",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-4 h-4"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
};

const FINDING_SEVERITY_STYLES: Record<
  RiskFinding["severity"],
  { bg: string; text: string; border: string; icon: JSX.Element }
> = {
  info: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/20",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-4 h-4 shrink-0"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  warning: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/20",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-4 h-4 shrink-0"
      >
        <path
          fillRule="evenodd"
          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  critical: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/20",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-4 h-4 shrink-0"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
};

const LEVEL_LABELS: Record<RiskClassification["level"], string> = {
  sustainable: "Sustainable",
  caution: "Caution",
  unsustainable: "Unsustainable",
};

// ---------------------------------------------------------------------------
// RiskBadge
// ---------------------------------------------------------------------------

export function RiskBadge({ risk, report, loading }: RiskBadgeProps) {
  const [expanded, setExpanded] = useState(false);

  // Loading state
  if (loading) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-700 animate-pulse">
        <div className="w-4 h-4 rounded-full bg-slate-600" />
        <div className="w-20 h-3 rounded bg-slate-600" />
      </div>
    );
  }

  // Null / no result yet
  if (!risk) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700">
        <span className="text-sm text-slate-500">Run simulation</span>
      </div>
    );
  }

  const style = LEVEL_STYLES[risk.level];

  return (
    <div className="flex flex-col">
      {/* Badge pill */}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className={`
          inline-flex items-center gap-2 px-3 py-1.5 rounded-full border
          transition-colors cursor-pointer select-none
          ${style.bg} ${style.text}
          hover:brightness-110
        `}
      >
        {style.icon}
        <span className="text-sm font-medium">{LEVEL_LABELS[risk.level]}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`w-4 h-4 transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Expandable report detail */}
      <div
        className={`
          overflow-hidden transition-all duration-300 ease-in-out
          ${expanded ? "max-h-[2000px] opacity-100 mt-4" : "max-h-0 opacity-0 mt-0"}
        `}
      >
        {report && (
          <div className="flex flex-col gap-4">
            {/* Headline & summary */}
            <div className="rounded-lg bg-slate-800 border border-slate-700 p-4">
              <p className="text-base font-semibold text-slate-100">
                {report.headline}
              </p>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                {report.summary}
              </p>
            </div>

            {/* Findings */}
            {report.findings.length > 0 && (
              <div className="flex flex-col gap-2">
                <h4 className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                  Findings
                </h4>
                {report.findings.map((finding, idx) => {
                  const fStyle = FINDING_SEVERITY_STYLES[finding.severity];
                  return (
                    <div
                      key={`${finding.category}-${idx}`}
                      className={`
                        rounded-lg border p-3 ${fStyle.bg} ${fStyle.border}
                      `}
                    >
                      <div className="flex items-start gap-2">
                        <span className={fStyle.text}>{fStyle.icon}</span>
                        <div className="flex flex-col gap-1 min-w-0">
                          <p
                            className={`text-sm font-medium ${fStyle.text}`}
                          >
                            {finding.title}
                          </p>
                          <p className="text-sm text-slate-400 leading-relaxed">
                            {finding.explanation}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Winners & losers */}
            {report.winnersLosers && (
              <div className="rounded-lg bg-slate-800 border border-slate-700 p-4">
                <h4 className="text-xs font-semibold tracking-wider text-slate-400 uppercase mb-2">
                  Winners & Losers
                </h4>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {report.winnersLosers}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
