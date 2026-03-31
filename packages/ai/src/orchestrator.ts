// ---------------------------------------------------------------------------
// Pipeline orchestrator — coordinates generate → compile → test
// ---------------------------------------------------------------------------
// For MVP this runs in-process. Production will use BullMQ + Redis.

import type { GenerationResult, GenerationProgress } from "./generator";

// ---- Public types ---------------------------------------------------------

export type PipelineStage = "generate" | "compile" | "test" | "complete";

export interface PipelineProgress {
  stage: PipelineStage;
  /** 0-100 within the current stage. */
  stageProgress: number;
  /** 0-100 across all stages. */
  overallProgress: number;
  message: string;
}

export interface PipelineResult {
  generation: GenerationResult;
  compilation: {
    success: boolean;
    contracts: Record<string, { abi: unknown[]; bytecode: string }>;
    warnings: string[];
  };
  tests: {
    passed: number;
    failed: number;
    skipped: number;
    results: Array<{
      name: string;
      status: "passed" | "failed" | "skipped";
      error?: string;
    }>;
  };
}

export interface PipelineRequest {
  projectId: string;
  projectName: string;
  templateId: string;
  params: Record<string, unknown>;
  skipTests?: boolean;
}

// ---- Helpers --------------------------------------------------------------

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function report(
  onProgress: ((p: PipelineProgress) => void) | undefined,
  stage: PipelineStage,
  stageProgress: number,
  overallProgress: number,
  message: string,
): void {
  onProgress?.({ stage, stageProgress, overallProgress, message });
}

// ---- Pipeline implementation ----------------------------------------------

export async function runPipeline(
  request: PipelineRequest,
  onProgress?: (progress: PipelineProgress) => void,
): Promise<PipelineResult> {
  // ---------- Stage 1: Generate (0 – 50%) ----------

  report(onProgress, "generate", 0, 0, "Starting code generation…");

  // Dynamically import the generator so the orchestrator file can be loaded
  // even before the generator module is wired up.
  const { generateDApp } = await import("./generator");

  const generation = await generateDApp(
    {
      projectId: request.projectId,
      projectName: request.projectName,
      templateId: request.templateId,
      params: request.params,
    },
    (gp: GenerationProgress) => {
      // Scale the generator's 0-100 progress into the 0-50% overall band.
      const scaled = Math.round(gp.progress * 0.5);
      report(onProgress, "generate", gp.progress, scaled, gp.message);
    },
  );

  report(onProgress, "generate", 100, 50, "Code generation complete");

  // ---------- Stage 2: Compile (50 – 80%) ----------

  report(onProgress, "compile", 0, 50, "Compiling contracts…");

  // MVP: simulate compilation with a realistic delay sequence.
  await delay(500);
  report(onProgress, "compile", 30, 59, "Resolving Solidity imports…");

  await delay(600);
  report(onProgress, "compile", 60, 68, "Running solc compiler…");

  await delay(400);
  report(onProgress, "compile", 90, 77, "Generating ABI and bytecode…");

  // Build mock compilation output from generated contract files.
  const contracts: Record<string, { abi: unknown[]; bytecode: string }> = {};
  for (const file of generation.files) {
    if (file.path.endsWith(".sol")) {
      const name = file.path.split("/").pop()!.replace(".sol", "");
      contracts[name] = {
        abi: [
          {
            type: "function",
            name: "placeholder",
            inputs: [],
            outputs: [],
            stateMutability: "view",
          },
        ],
        bytecode: `0x${"60806040".repeat(8)}`, // mock bytecode
      };
    }
  }

  const compilation: PipelineResult["compilation"] = {
    success: true,
    contracts,
    warnings: [],
  };

  report(onProgress, "compile", 100, 80, "Compilation successful");

  // ---------- Stage 3: Test (80 – 100%) ----------

  if (request.skipTests) {
    report(onProgress, "test", 100, 100, "Tests skipped");
  } else {
    report(onProgress, "test", 0, 80, "Running test suite…");

    // MVP: simulate test execution.
    const testNames = [
      "should deploy successfully",
      "should initialize with correct parameters",
      "should handle basic operations",
      "should enforce access control",
      "should emit expected events",
    ];

    const testResults: PipelineResult["tests"]["results"] = [];

    for (let i = 0; i < testNames.length; i++) {
      await delay(300);
      testResults.push({ name: testNames[i]!, status: "passed" });

      const stageProgress = Math.round(((i + 1) / testNames.length) * 100);
      const overallProgress = 80 + Math.round(((i + 1) / testNames.length) * 20);
      report(
        onProgress,
        "test",
        stageProgress,
        overallProgress,
        `Test ${i + 1}/${testNames.length}: ${testNames[i]}`,
      );
    }
  }

  const tests: PipelineResult["tests"] = request.skipTests
    ? { passed: 0, failed: 0, skipped: 5, results: [] }
    : {
        passed: 5,
        failed: 0,
        skipped: 0,
        results: [
          { name: "should deploy successfully", status: "passed" },
          { name: "should initialize with correct parameters", status: "passed" },
          { name: "should handle basic operations", status: "passed" },
          { name: "should enforce access control", status: "passed" },
          { name: "should emit expected events", status: "passed" },
        ],
      };

  // ---------- Complete --------------------------------------------------------

  report(onProgress, "complete", 100, 100, "Pipeline complete");

  return { generation, compilation, tests };
}
