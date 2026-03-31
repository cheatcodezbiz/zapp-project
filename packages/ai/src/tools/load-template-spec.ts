// ---------------------------------------------------------------------------
// Tool executor: load_template_spec
// ---------------------------------------------------------------------------
// Lets the AI agent explicitly request template architecture specs on demand
// instead of loading all specs into the system prompt upfront.
// ---------------------------------------------------------------------------

import {
  getTemplateSpecById,
  getDegenModeSpec,
} from "../prompts/template-specs";

/** Template IDs that use degen/grandpa economics */
const DEGEN_TEMPLATE_IDS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 14]);

export interface LoadTemplateSpecInput {
  templateIds: number[];
  includeDegenEconomics?: boolean;
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

  // If any requested template is in the degen set, auto-include degen economics
  const hasDegenTemplate = input.templateIds.some((id) =>
    DEGEN_TEMPLATE_IDS.has(id),
  );
  if (hasDegenTemplate && input.includeDegenEconomics !== false) {
    const degenSpec = getDegenModeSpec();
    if (degenSpec) {
      sections.push(`## ECONOMICS OVERRIDE — Degen Mode\n\n${degenSpec}`);
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
