"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";

// ---------------------------------------------------------------------------
// Chain options
// ---------------------------------------------------------------------------

const CHAINS = [
  { value: "ethereum", label: "Ethereum" },
  { value: "base", label: "Base" },
  { value: "arbitrum", label: "Arbitrum" },
  { value: "polygon", label: "Polygon" },
  { value: "optimism", label: "Optimism" },
  { value: "avalanche", label: "Avalanche" },
  { value: "bsc", label: "BNB Chain" },
] as const;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function BlankProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [chain, setChain] = useState("ethereum");

  const createProject = trpc.projects.create.useMutation({
    onSuccess: (project) => {
      router.push(`/app/projects/${project.id}/builder`);
    },
  });

  const handleCreate = () => {
    if (!name.trim()) return;
    createProject.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      chain,
    });
  };

  return (
    <div className="mx-auto max-w-lg space-y-8 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <a href="/app/templates" className="hover:text-foreground">
          Templates
        </a>
        <span>/</span>
        <span className="text-foreground">Blank Project</span>
      </div>

      {/* Header */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-border">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-7 w-7 text-muted-foreground"
          >
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Create Blank Project
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Start from scratch — describe what you want to build and the AI will
          generate it.
        </p>
      </div>

      {/* Form */}
      <div className="space-y-5 rounded-lg border border-border bg-card p-6">
        {/* Project name */}
        <div>
          <label
            htmlFor="project-name"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Project Name
          </label>
          <input
            id="project-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My DeFi Protocol"
            maxLength={100}
            className="w-full rounded-md border border-border bg-surface-container px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Description (optional) */}
        <div>
          <label
            htmlFor="project-desc"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Description{" "}
            <span className="font-normal text-muted-foreground">
              (optional)
            </span>
          </label>
          <textarea
            id="project-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A brief description of what you're building..."
            maxLength={500}
            rows={3}
            className="w-full resize-none rounded-md border border-border bg-surface-container px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Chain selector */}
        <div>
          <label
            htmlFor="chain"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Target Chain
          </label>
          <select
            id="chain"
            value={chain}
            onChange={(e) => setChain(e.target.value)}
            className="w-full rounded-md border border-border bg-surface-container px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {CHAINS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Action */}
      <button
        type="button"
        onClick={handleCreate}
        disabled={!name.trim() || createProject.isPending}
        className="w-full rounded-md bg-primary py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {createProject.isPending ? "Creating..." : "Create Project"}
      </button>

      {createProject.isError && (
        <p className="text-center text-sm text-red-400">
          {createProject.error.message}
        </p>
      )}
    </div>
  );
}
