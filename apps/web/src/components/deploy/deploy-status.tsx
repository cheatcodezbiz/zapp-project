"use client";

import { useState, useEffect } from "react";

// ---------------------------------------------------------------------------
// Deploy Status — progress / success / error states for deployment
// ---------------------------------------------------------------------------

export interface DeployStatusProps {
  status: "idle" | "deploying" | "deployed" | "failed";
  chainName: string;
  /** Simulated contract addresses */
  proxyAddress?: string;
  implementationAddress?: string;
  txHash?: string;
  explorerUrl?: string;
  error?: string;
  onRetry?: () => void;
}

// ── Deploying stage animation ─────────────────────────────────────────────

const STAGES = [
  "Deploying implementation contract...",
  "Deploying proxy contract...",
  "Verifying contracts on-chain...",
  "Finalizing deployment...",
];

function DeployingProgress() {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStageIndex((prev) => Math.min(prev + 1, STAGES.length - 1));
    }, 600);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <Spinner />
        <span className="text-sm font-medium text-foreground">
          Deploying to chain...
        </span>
      </div>

      <div className="space-y-2">
        {STAGES.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            {i < stageIndex ? (
              <CheckIcon className="text-green-500" />
            ) : i === stageIndex ? (
              <Spinner size="sm" />
            ) : (
              <span className="h-4 w-4 shrink-0 rounded-full border border-border" />
            )}
            <span
              className={`text-sm ${
                i <= stageIndex
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Deployed (success) ────────────────────────────────────────────────────

function DeployedSuccess({
  chainName,
  proxyAddress,
  implementationAddress,
  txHash,
  explorerUrl,
}: Pick<
  DeployStatusProps,
  "chainName" | "proxyAddress" | "implementationAddress" | "txHash" | "explorerUrl"
>) {
  return (
    <div className="rounded-lg border border-green-600/40 bg-green-950/20 p-5">
      <div className="mb-4 flex items-center gap-2 text-green-500">
        <CheckIcon />
        <span className="text-sm font-semibold">
          Successfully deployed to {chainName}
        </span>
      </div>

      <div className="space-y-3 text-sm">
        {implementationAddress && (
          <AddressRow label="Implementation" address={implementationAddress} />
        )}
        {proxyAddress && (
          <AddressRow label="Proxy" address={proxyAddress} />
        )}
        {txHash && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Tx Hash</span>
            <CopyableText text={txHash} />
          </div>
        )}
      </div>

      {explorerUrl && txHash && (
        <a
          href={`${explorerUrl}/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="
            mt-4 inline-flex items-center gap-1.5 rounded-md
            bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground
            transition-colors hover:bg-primary/80
          "
        >
          View on Explorer
          <ExternalLinkIcon />
        </a>
      )}
    </div>
  );
}

// ── Failed ────────────────────────────────────────────────────────────────

function DeployFailed({
  error,
  onRetry,
}: {
  error?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-lg border border-red-600/40 bg-red-950/20 p-5">
      <div className="mb-2 flex items-center gap-2 text-red-500">
        <XIcon />
        <span className="text-sm font-semibold">Deployment failed</span>
      </div>
      {error && (
        <p className="mb-3 text-sm text-red-400/90">{error}</p>
      )}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="
            rounded-md border border-red-600/40 px-3 py-1.5
            text-xs font-medium text-red-400
            transition-colors hover:bg-red-950/40
            focus:outline-none focus:ring-2 focus:ring-red-500
          "
        >
          Retry Deployment
        </button>
      )}
    </div>
  );
}

// ── Public component ──────────────────────────────────────────────────────

export function DeployStatus(props: DeployStatusProps) {
  if (props.status === "idle") return null;

  if (props.status === "deploying") return <DeployingProgress />;

  if (props.status === "deployed") {
    return (
      <DeployedSuccess
        chainName={props.chainName}
        proxyAddress={props.proxyAddress}
        implementationAddress={props.implementationAddress}
        txHash={props.txHash}
        explorerUrl={props.explorerUrl}
      />
    );
  }

  return <DeployFailed error={props.error} onRetry={props.onRetry} />;
}

// ── Helper: address row ───────────────────────────────────────────────────

function AddressRow({ label, address }: { label: string; address: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <CopyableText text={address} />
    </div>
  );
}

// ── Helper: copyable text ─────────────────────────────────────────────────

function CopyableText({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const truncated =
    text.length > 14
      ? `${text.slice(0, 6)}...${text.slice(-4)}`
      : text;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Silently fail if clipboard not available
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={text}
      className="
        inline-flex items-center gap-1 rounded px-1.5 py-0.5
        font-mono text-xs text-foreground
        transition-colors hover:bg-surface-container-high
      "
    >
      <span>{truncated}</span>
      <span className="text-[10px] text-muted-foreground">
        {copied ? "Copied!" : "Copy"}
      </span>
    </button>
  );
}

// ── Tiny icons ────────────────────────────────────────────────────────────

function Spinner({ size = "md" }: { size?: "sm" | "md" }) {
  const dim = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  return (
    <svg
      className={`${dim} animate-spin text-primary`}
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
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      className="h-3 w-3"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"
      />
    </svg>
  );
}
