"use client";

import { useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import type { FullSimConfig } from "@zapp/simulation";
import { getTemplateById } from "@/lib/templates";
import { createDefaultConfig } from "@/hooks/use-simulation";
import { formatCredits, calculateFee } from "@/lib/format-credits";
import { useCreditStore } from "@/stores/credit-store";
import { useGenerationStore } from "@/stores/generation-store";

// ============================================================================
// Template Configurator Page
// ============================================================================

export default function TemplateConfiguratorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const template = getTemplateById(params.id);
  const spendCredits = useCreditStore((s) => s.spendCredits);
  const balance = useCreditStore((s) => s.balanceCents);

  const [step, setStep] = useState<"configure" | "confirm">("configure");

  // Merge template defaults into the base config
  const config = useMemo(() => {
    if (!template?.defaultSimConfig) return createDefaultConfig();
    const base = createDefaultConfig();
    return {
      ...base,
      ...template.defaultSimConfig,
      stakingParams: {
        ...base.stakingParams,
        ...(template.defaultSimConfig.stakingParams ?? {}),
      },
      behavior: {
        ...base.behavior,
        ...(template.defaultSimConfig.behavior ?? {}),
      },
      scenario: {
        ...base.scenario,
        ...(template.defaultSimConfig.scenario ?? {}),
        name: template.name,
      },
    } as FullSimConfig;
  }, [template]);

  const fee = useMemo(
    () => (template ? calculateFee(template.estimatedCredits) : null),
    [template],
  );

  const handleSimulate = useCallback(() => {
    // Navigate to simulate page with config pre-loaded via query params
    const encoded = encodeURIComponent(JSON.stringify(config));
    router.push(`/app/simulate?template=${params.id}&config=${encoded}`);
  }, [config, params.id, router]);

  const startJob = useGenerationStore((s) => s.startJob);

  const handleGenerate = useCallback(() => {
    if (!template) return;
    const success = spendCredits(template.estimatedCredits);
    if (!success) return;
    const job = startJob({
      projectName: template.name,
      templateId: template.id,
    });
    router.push(`/app/generate/${job.id}`);
  }, [template, spendCredits, startJob, router]);

  // ── Not Found ──────────────────────────────────────────────────────────
  if (!template) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg font-medium text-foreground">
          Template not found
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          The template you&apos;re looking for doesn&apos;t exist.
        </p>
        <a
          href="/app/templates"
          className="mt-6 inline-flex h-10 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Back to Templates
        </a>
      </div>
    );
  }

  // ── Confirm Step ───────────────────────────────────────────────────────
  if (step === "confirm") {
    const canAfford = balance >= template.estimatedCredits;
    return (
      <div className="mx-auto max-w-lg space-y-8 py-8">
        <button
          type="button"
          onClick={() => setStep("configure")}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Back
        </button>

        <div className="rounded-lg border border-border bg-card p-6">
          <div className="mb-4 text-center">
            <div className="mb-3 text-4xl">{template.icon}</div>
            <h2 className="text-xl font-bold text-foreground">
              Generate {template.name}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This will use credits from your balance to generate the full dApp.
            </p>
          </div>

          <div className="space-y-3 rounded-md bg-surface-container p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Template</span>
              <span className="font-medium text-foreground">
                {template.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Generation cost</span>
              <span className="font-medium text-foreground">
                {formatCredits(template.estimatedCredits)}
              </span>
            </div>
            <div className="border-t border-border pt-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Your balance</span>
                <span
                  className={`font-medium ${canAfford ? "text-green-400" : "text-red-400"}`}
                >
                  {formatCredits(balance)}
                </span>
              </div>
              {!canAfford && (
                <p className="mt-2 text-xs text-red-400">
                  Insufficient credits. You need{" "}
                  {formatCredits(template.estimatedCredits - balance)} more.
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canAfford}
            className="mt-6 w-full rounded-md bg-primary py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {canAfford
              ? `Generate — ${formatCredits(template.estimatedCredits)}`
              : "Insufficient Credits"}
          </button>
        </div>
      </div>
    );
  }

  // ── Configure Step (default) ───────────────────────────────────────────
  const _difficulty = template.difficulty;

  return (
    <div className="space-y-8 py-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <a href="/app/templates" className="hover:text-foreground">
          Templates
        </a>
        <span>/</span>
        <span className="text-foreground">{template.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start gap-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-surface-container-high text-3xl">
          {template.icon}
        </div>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            {template.name}
          </h1>
          <p className="mt-1 text-on-surface-variant">{template.description}</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="rounded-sm bg-surface-container-high px-2.5 py-0.5 text-xs font-medium text-on-surface-variant capitalize">
              {template.category}
            </span>
            <span className="text-xs text-on-surface-variant capitalize">
              {_difficulty}
            </span>
            {template.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-sm bg-surface-container-high px-2.5 py-0.5 text-xs text-on-surface-variant"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* What you'll get */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          What you&apos;ll get
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-md bg-surface-container p-4">
            <p className="text-sm font-medium text-foreground">
              Smart Contracts
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              UUPS upgradeable Solidity contracts with OpenZeppelin 5.x
            </p>
          </div>
          <div className="rounded-md bg-surface-container p-4">
            <p className="text-sm font-medium text-foreground">
              Frontend dApp
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Next.js app with wallet connection and contract interactions
            </p>
          </div>
          <div className="rounded-md bg-surface-container p-4">
            <p className="text-sm font-medium text-foreground">
              Deploy Config
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Hardhat deployment scripts for any EVM chain
            </p>
          </div>
        </div>
      </div>

      {/* Simulation preview */}
      {template.defaultSimConfig && (
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Simulation Preview
          </h3>
          <p className="mb-4 text-sm text-muted-foreground">
            This template comes with pre-configured simulation parameters. Run a
            simulation to test your tokenomics before deploying.
          </p>
          <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <span className="text-muted-foreground">Duration</span>
              <p className="font-medium text-foreground">
                {config.timeSteps} days
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Emission Model</span>
              <p className="font-medium text-foreground capitalize">
                {config.stakingParams.emissionModel.replace("-", " ")}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Initial Users</span>
              <p className="font-medium text-foreground">
                {config.behavior.initialUsers.toLocaleString()}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Supply Cap</span>
              <p className="font-medium text-foreground">
                {config.stakingParams.maxSupply.toLocaleString()}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSimulate}
            className="mt-4 rounded-md border border-border bg-surface-container-high px-6 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-bright"
          >
            Run Simulation First
          </button>
        </div>
      )}

      {/* Cost & action */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-6">
        <div>
          <p className="text-sm text-muted-foreground">Estimated cost</p>
          <p className="text-2xl font-bold text-foreground">
            {formatCredits(template.estimatedCredits)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSimulate}
            className="rounded-md border border-border bg-surface-container-high px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-bright"
          >
            Simulate
          </button>
          <button
            type="button"
            onClick={() => setStep("confirm")}
            className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Generate dApp
          </button>
        </div>
      </div>
    </div>
  );
}
