export type AIModel =
  | "claude-opus"
  | "claude-sonnet"
  | "claude-haiku"
  | "deepseek-coder";

export interface AIRouter {
  /** Generate a completion for the given prompt, optionally forcing a specific model. */
  generate(prompt: string, model?: AIModel): Promise<string>;

  /**
   * Select the best model for a given task type.
   *
   * Routing table:
   *  - "contract-generation" -> claude-opus
   *  - "security-review"    -> claude-opus
   *  - "frontend-generation" -> claude-sonnet
   *  - "test-generation"    -> claude-haiku
   *  - "boilerplate"        -> claude-haiku
   *  - default              -> claude-sonnet
   */
  selectModel(task: string): AIModel;
}

/** Model name mapping for the Anthropic API */
const ANTHROPIC_MODEL_MAP: Record<AIModel, string> = {
  "claude-opus": "claude-opus-4-20250514",
  "claude-sonnet": "claude-sonnet-4-20250514",
  "claude-haiku": "claude-haiku-4-20250514",
  "deepseek-coder": "claude-sonnet-4-20250514", // fallback — DeepSeek not wired yet
};

export function createAIRouter(): AIRouter {
  const MODEL_MAP: Record<string, AIModel> = {
    "contract-generation": "claude-opus",
    "security-review": "claude-opus",
    "frontend-generation": "claude-sonnet",
    "test-generation": "claude-haiku",
    "boilerplate": "claude-haiku",
  };

  return {
    async generate(prompt: string, model?: AIModel): Promise<string> {
      const selectedModel = model ?? "claude-sonnet";

      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error(
          "ANTHROPIC_API_KEY is not set. Set the environment variable or use " +
            "generateDApp() which supports template-based fallback.",
        );
      }

      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const client = new Anthropic({ apiKey });

      console.log(
        `[ai-router] generate called with model=${selectedModel}, prompt length=${prompt.length}`,
      );

      const response = await client.messages.create({
        model: ANTHROPIC_MODEL_MAP[selectedModel],
        max_tokens: 16_384,
        messages: [{ role: "user", content: prompt }],
      });

      const textBlock = response.content.find(
        (block) => block.type === "text",
      );
      if (!textBlock || textBlock.type !== "text") {
        throw new Error("No text content in Anthropic response");
      }

      return textBlock.text;
    },

    selectModel(task: string): AIModel {
      return MODEL_MAP[task] ?? "claude-sonnet";
    },
  };
}
