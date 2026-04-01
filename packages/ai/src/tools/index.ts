// ---------------------------------------------------------------------------
// Tool definitions for Claude API tool-use
// ---------------------------------------------------------------------------
// Each tool defines its name, description, and JSON Schema input_schema.
// These are passed directly to the Anthropic messages.create() call.
// ---------------------------------------------------------------------------

import type Anthropic from "@anthropic-ai/sdk";

type Tool = Anthropic.Messages.Tool;

export const tools: Tool[] = [
  {
    name: "generate_contract",
    description:
      "Generate a Solidity smart contract. Use this when the user wants to create a new smart contract. Always ask what kind of contract and what features they need before calling this tool. If you identify a matching template architecture (1-45), pass the templateId so the proven blueprint is used.",
    input_schema: {
      type: "object" as const,
      properties: {
        contractType: {
          type: "string",
          enum: ["staking", "token", "nft", "governance", "vault", "dex", "game", "bridge", "marketplace", "launchpad", "custom"],
          description: "The type of smart contract to generate.",
        },
        name: {
          type: "string",
          description:
            "PascalCase name for the contract (e.g. 'MyStakingVault').",
        },
        description: {
          type: "string",
          description:
            "Detailed requirements for the contract — what it should do, key features, and any specific constraints.",
        },
        templateId: {
          type: "number",
          description:
            "Optional template architecture ID (1-45) to use as the structural blueprint. If provided, the contract will follow the exact architecture, storage layout, and security fixes from the proven template spec.",
        },
        parameters: {
          type: "object",
          additionalProperties: true,
          description:
            "Contract-specific parameters (e.g. rewardRate, lockDuration, maxSupply).",
        },
        features: {
          type: "array",
          items: { type: "string" },
          description:
            'Optional features to include (e.g. ["emergencyWithdraw", "compounding", "timelockAdmin"]).',
        },
      },
      required: ["contractType", "name", "description"],
    },
  },
  {
    name: "generate_frontend",
    description:
      "Generate a React frontend UI for interacting with a smart contract. Use this after a contract has been generated. Requires the contract name and desired UI features.",
    input_schema: {
      type: "object" as const,
      properties: {
        contractName: {
          type: "string",
          description: "Name of the contract this frontend is for.",
        },
        contractABI: {
          type: "string",
          description:
            "JSON string of the contract ABI. Optional — if not provided, the frontend will use a generic ABI pattern.",
        },
        features: {
          type: "array",
          items: { type: "string" },
          description:
            'UI features to include (e.g. ["stakeForm", "rewardsDashboard", "adminPanel", "transactionHistory"]).',
        },
        style: {
          type: "string",
          enum: ["minimal", "dashboard", "defi-app"],
          description: "Visual style of the frontend. Defaults to 'dashboard'.",
        },
      },
      required: ["contractName", "features"],
    },
  },
  {
    name: "generate_tests",
    description:
      "Generate a Hardhat test suite for a smart contract. Requires the contract name and its Solidity source code.",
    input_schema: {
      type: "object" as const,
      properties: {
        contractName: {
          type: "string",
          description: "Name of the contract to test.",
        },
        contractCode: {
          type: "string",
          description: "The full Solidity source code of the contract.",
        },
      },
      required: ["contractName", "contractCode"],
    },
  },
  {
    name: "run_simulation",
    description:
      "Run a tokenomics simulation to model how staking rewards, token supply, and price might behave over time. Use this when the user wants to test or visualize their tokenomics.",
    input_schema: {
      type: "object" as const,
      properties: {
        totalSupply: {
          type: "number",
          description: "Total token supply at genesis.",
        },
        initialPrice: {
          type: "number",
          description: "Starting token price in USD.",
        },
        rewardRate: {
          type: "number",
          description:
            "Annual reward rate as a fraction (0-1). For example, 0.1 = 10% APY.",
        },
        emissionDecay: {
          type: "number",
          description:
            "Rate at which emissions decrease over time (0-1). 0 = no decay, 0.5 = halves quickly.",
        },
        feeRate: {
          type: "number",
          description:
            "Fee rate as a fraction (0-1). For example, 0.003 = 0.3% per transaction.",
        },
        initialStakers: {
          type: "number",
          description: "Number of staking users at launch.",
        },
        durationDays: {
          type: "number",
          description:
            "How many days to simulate. Defaults to 365 if not specified.",
        },
      },
      required: ["totalSupply", "initialPrice", "rewardRate"],
    },
  },
  {
    name: "edit_code",
    description:
      "Edit an existing generated file. Use this when the user wants to modify a contract, frontend, or test file that has already been generated. Always confirm what changes the user wants before calling this tool.",
    input_schema: {
      type: "object" as const,
      properties: {
        filename: {
          type: "string",
          description: "Name of the file to edit.",
        },
        currentCode: {
          type: "string",
          description: "The current full source code of the file.",
        },
        editInstructions: {
          type: "string",
          description:
            "Detailed instructions for what to change in the file.",
        },
      },
      required: ["filename", "currentCode", "editInstructions"],
    },
  },
  {
    name: "explain_concept",
    description:
      "Explain a blockchain or DeFi concept in plain English. Use this when the user asks 'what is...', 'how does...', or needs help understanding a technical concept.",
    input_schema: {
      type: "object" as const,
      properties: {
        concept: {
          type: "string",
          description: "The concept to explain (e.g. 'staking', 'liquidity pool', 'UUPS proxy').",
        },
        context: {
          type: "string",
          description:
            "How this concept relates to the user's current project, to make the explanation more relevant.",
        },
      },
      required: ["concept"],
    },
  },
  {
    name: "security_audit",
    description:
      "Perform a security review of a smart contract. Checks for reentrancy, access control issues, integer overflow, front-running vulnerabilities, gas optimization, and logic errors.",
    input_schema: {
      type: "object" as const,
      properties: {
        contractCode: {
          type: "string",
          description: "The full Solidity source code to audit.",
        },
        contractName: {
          type: "string",
          description: "Name of the contract being audited.",
        },
      },
      required: ["contractCode", "contractName"],
    },
  },
  {
    name: "load_template_spec",
    description:
      "Load the full architecture specification for a template. Call this BEFORE generating a contract when you've identified the matching template from the index. Returns complete storage layouts, function signatures, security fixes, and configurable parameters.",
    input_schema: {
      type: "object" as const,
      properties: {
        templateIds: {
          type: "array",
          items: { type: "number" },
          description:
            "Array of template IDs (1-45) to load specs for. Load only what you need. Degen economics are included inline in each template spec.",
        },
      },
      required: ["templateIds"],
    },
  },
];
