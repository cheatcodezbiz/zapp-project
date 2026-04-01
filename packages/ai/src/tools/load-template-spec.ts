// ---------------------------------------------------------------------------
// Tool executor: load_template_spec
// ---------------------------------------------------------------------------
// Lets the AI agent explicitly request template architecture specs on demand
// instead of loading all specs into the system prompt upfront.
// ---------------------------------------------------------------------------

import { getTemplateSpecById } from "../prompts/template-specs";

export interface LoadTemplateSpecInput {
  templateIds: number[];
}

export async function executeLoadTemplateSpec(
  input: LoadTemplateSpecInput,
): Promise<{ result: unknown }> {
  const sections: string[] = [];

  // Load each requested template spec
  for (const id of input.templateIds) {
    const spec = getTemplateSpecById(id);
    if (spec) {
      sections.push(spec);
    } else {
      sections.push(`Template #${id}: spec not found.`);
    }
  }

  const idList = input.templateIds.join(", ");

  return {
    result: {
      success: true,
      templateIds: input.templateIds,
      specs: sections.join("\n\n---\n\n"),
      message: `Loaded architecture specs for template(s) ${idList}.`,
    },
  };
}
