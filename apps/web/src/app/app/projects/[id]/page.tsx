"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { useProjectStore, type ProjectFile } from "@/stores/project-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncateAddress(addr: string) {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_STYLES: Record<string, string> = {
  deployed:
    "bg-green-500/15 text-green-400 border border-green-500/30",
  generating:
    "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
  compiled:
    "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  simulated:
    "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  failed:
    "bg-red-500/15 text-red-400 border border-red-500/30",
  draft:
    "bg-gray-500/15 text-gray-400 border border-gray-500/30",
};

// ---------------------------------------------------------------------------
// Copy button
// ---------------------------------------------------------------------------

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className="ml-2 inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      title="Copy to clipboard"
    >
      {copied ? (
        <span className="text-green-400">Copied!</span>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Status Badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status] ?? STATUS_STYLES.draft}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

type Tab = "overview" | "code" | "deployment";

// ---------------------------------------------------------------------------
// Overview Tab
// ---------------------------------------------------------------------------

function OverviewTab({
  project,
}: {
  project: ReturnType<typeof useProjectStore.getState>["projects"][number];
}) {
  const contractFiles = project.files.filter(
    (f) => f.language === "solidity",
  ).length;
  const tsFiles = project.files.filter(
    (f) => f.language === "typescript",
  ).length;

  return (
    <div className="space-y-6">
      {/* Quick stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Files Generated</p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {project.files.length}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {contractFiles} contract{contractFiles !== 1 ? "s" : ""},{" "}
            {tsFiles} TypeScript
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Template</p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {project.templateId
              .replace(/-/g, " ")
              .replace(/\b\w/g, (c) => c.toUpperCase())}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Chain</p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {project.deployment?.chainName ?? "Not deployed"}
          </p>
          {project.deployment && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Chain ID: {project.deployment.chainId}
            </p>
          )}
        </div>
      </div>

      {/* Action buttons */}
      {project.deployment && (
        <div className="flex flex-wrap gap-3">
          <a
            href={`${project.deployment.explorerUrl}/address/${project.deployment.proxyAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            View on Explorer
          </a>
          <a
            href="#"
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            Open Frontend
          </a>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Code Tab
// ---------------------------------------------------------------------------

type FileCategory = "contracts" | "frontend" | "tests";

function getFileCategory(file: ProjectFile): FileCategory {
  if (file.language === "solidity") return "contracts";
  if (file.path.startsWith("test/") || file.path.includes(".test."))
    return "tests";
  return "frontend";
}

function CodeTab({
  files,
}: {
  files: ProjectFile[];
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<FileCategory | "all">(
    "all",
  );

  const filtered =
    categoryFilter === "all"
      ? files
      : files.filter((f) => getFileCategory(f) === categoryFilter);

  const activeFile = filtered[selectedIndex] ?? filtered[0];

  const categoryCounts = {
    contracts: files.filter((f) => getFileCategory(f) === "contracts").length,
    frontend: files.filter((f) => getFileCategory(f) === "frontend").length,
    tests: files.filter((f) => getFileCategory(f) === "tests").length,
  };

  return (
    <div className="space-y-4">
      {/* Category filter pills */}
      <div className="flex gap-2">
        {(
          [
            { key: "all", label: "All", count: files.length },
            { key: "contracts", label: "Contracts", count: categoryCounts.contracts },
            { key: "frontend", label: "Frontend", count: categoryCounts.frontend },
            { key: "tests", label: "Tests", count: categoryCounts.tests },
          ] as const
        ).map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => {
              setCategoryFilter(key);
              setSelectedIndex(0);
            }}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              categoryFilter === key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      {/* File tree + code viewer */}
      <div className="flex gap-4 overflow-hidden rounded-lg border border-border">
        {/* File tree sidebar */}
        <div className="w-56 shrink-0 border-r border-border bg-card">
          <div className="p-2">
            <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Files
            </p>
            {filtered.map((file, i) => (
              <button
                key={file.path}
                onClick={() => setSelectedIndex(i)}
                className={`flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                  i === selectedIndex
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <span className="mr-2 text-xs">
                  {file.language === "solidity"
                    ? "sol"
                    : file.language === "json"
                      ? "{}"
                      : "ts"}
                </span>
                <span className="truncate font-mono text-xs">
                  {file.path.split("/").pop()}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Code viewer */}
        <div className="min-w-0 flex-1">
          {activeFile && (
            <>
              <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
                <span className="font-mono text-xs text-muted-foreground">
                  {activeFile.path}
                </span>
                <CopyButton text={activeFile.content} />
              </div>
              <div className="overflow-auto bg-gray-950 p-4">
                <pre className="text-sm leading-relaxed">
                  <code className="font-mono text-gray-300">
                    {activeFile.content}
                  </code>
                </pre>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Deployment Tab
// ---------------------------------------------------------------------------

function DeploymentTab({
  project,
}: {
  project: ReturnType<typeof useProjectStore.getState>["projects"][number];
}) {
  const dep = project.deployment;

  if (!dep) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
        <p className="mb-2 text-lg font-medium text-foreground">
          Not deployed yet
        </p>
        <p className="text-sm text-muted-foreground">
          Deploy your project to see chain and contract details here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Chain info */}
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/15 text-blue-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">
              {dep.chainName}
            </p>
            <p className="text-sm text-muted-foreground">
              Chain ID: {dep.chainId}
            </p>
          </div>
        </div>
      </div>

      {/* Contract addresses */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Contract Addresses
        </h3>
        <div className="space-y-4">
          <div>
            <p className="mb-1 text-xs text-muted-foreground">
              Proxy (UUPS)
            </p>
            <div className="flex items-center">
              <span className="font-mono text-sm text-foreground">
                {truncateAddress(dep.proxyAddress)}
              </span>
              <CopyButton text={dep.proxyAddress} />
              <a
                href={`${dep.explorerUrl}/address/${dep.proxyAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-xs text-primary hover:underline"
              >
                View
              </a>
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">
              Implementation
            </p>
            <div className="flex items-center">
              <span className="font-mono text-sm text-foreground">
                {truncateAddress(dep.implementationAddress)}
              </span>
              <CopyButton text={dep.implementationAddress} />
              <a
                href={`${dep.explorerUrl}/address/${dep.implementationAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-xs text-primary hover:underline"
              >
                View
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction hash */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Deployment Transaction
        </h3>
        <div className="flex items-center">
          <span className="font-mono text-sm text-foreground">
            {dep.txHash}
          </span>
          <CopyButton text={dep.txHash} />
          <a
            href={`${dep.explorerUrl}/tx/${dep.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 text-xs text-primary hover:underline"
          >
            View on {dep.chainName}scan
          </a>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Deployed {formatDate(dep.deployedAt)}
        </p>
      </div>

      {/* Upgrade button */}
      <button
        disabled
        className="inline-flex h-10 cursor-not-allowed items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-medium text-muted-foreground opacity-50"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mr-2"
        >
          <polyline points="16 16 12 12 8 16" />
          <line x1="12" y1="12" x2="12" y2="21" />
          <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
        </svg>
        Upgrade Contract (Coming Soon)
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const project = useProjectStore((s) =>
    s.projects.find((p) => p.id === params.id),
  );
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <p className="text-lg font-medium text-foreground">
          Project not found
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          The project you&apos;re looking for doesn&apos;t exist.
        </p>
        <a
          href="/app"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Back to Projects
        </a>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "code", label: "Code" },
    { key: "deployment", label: "Deployment" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <a
          href="/app"
          className="mb-4 inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-1"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Projects
        </a>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {project.name}
              </h1>
              <StatusBadge status={project.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {project.templateId
                .replace(/-/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase())}{" "}
              &middot; Created {formatDate(project.createdAt)}
            </p>
          </div>
        </div>

        {/* Open in Builder */}
        <Link
          href={`/app/projects/${params.id}/builder`}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" />
          </svg>
          Open in Builder
        </Link>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg bg-secondary p-1">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && <OverviewTab project={project} />}
      {activeTab === "code" && <CodeTab files={project.files} />}
      {activeTab === "deployment" && <DeploymentTab project={project} />}
    </div>
  );
}
