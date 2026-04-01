"use client";

import { useMemo } from "react";
import { buildPreviewHTML } from "./preview-html-template";

/**
 * Strip "use client" directives, imports, and exports so code runs in the
 * Babel-transformed iframe context. Mirrors SandboxPreview logic.
 */
function stripImportsAndDirectives(code: string): string {
  return code
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (/^["']use (client|server)["'];?$/.test(trimmed)) return false;
      if (/^import\s/.test(trimmed)) return false;
      if (/^const\s+\{.*\}\s*=\s*React\s*;?\s*$/.test(trimmed)) return false;
      if (/^export\s+(default\s+)?/.test(trimmed)) return false;
      return true;
    })
    .join("\n");
}

interface Artifact {
  type: string;
  language: string;
  code: string;
}

interface ProjectThumbnailProps {
  config: Record<string, unknown> | null;
  className?: string;
}

/**
 * Renders a tiny, non-interactive iframe preview of a project's frontend.
 * Falls back to null if the project has no TSX artifacts.
 */
export function ProjectThumbnail({ config, className }: ProjectThumbnailProps) {
  const htmlContent = useMemo(() => {
    if (!config) return null;

    const artifacts = config.artifacts as Artifact[] | undefined;
    if (!artifacts?.length) return null;

    const frontendArtifact = artifacts.find(
      (a) => a.language === "tsx" || a.type === "frontend",
    );
    if (!frontendArtifact?.code) return null;

    const cleanedCode = stripImportsAndDirectives(frontendArtifact.code);

    // Extract ABI from solidity artifact if present
    let abi: string | undefined;
    const solArtifact = artifacts.find((a) => a.language === "solidity");
    if (solArtifact?.code) {
      const match = solArtifact.code.match(/\/\*\s*ABI:\s*(\[[\s\S]*?\])\s*\*\//);
      if (match?.[1]) {
        try {
          JSON.parse(match[1]);
          abi = match[1];
        } catch { /* ignore */ }
      }
    }

    return buildPreviewHTML(cleanedCode, abi);
  }, [config]);

  if (!htmlContent) return null;

  return (
    <div className={className} style={{ position: "relative", overflow: "hidden" }}>
      <iframe
        srcDoc={htmlContent}
        sandbox="allow-scripts"
        tabIndex={-1}
        loading="lazy"
        className="pointer-events-none select-none border-0"
        title="Project thumbnail"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "1280px",
          height: "800px",
          transform: "scale(0.25)",
          transformOrigin: "top left",
        }}
      />
    </div>
  );
}
