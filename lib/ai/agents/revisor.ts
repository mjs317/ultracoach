import { generateObject } from "ai";
import { getModelSafe } from "@/lib/ai/providers";
import { RevisorOutputSchema } from "@/lib/ai/schemas";
import type { z } from "zod";
import { GeneratorOutputSchema, ReviewerOutputSchema } from "@/lib/ai/schemas";

export type RevisorInput = {
  generated: z.infer<typeof GeneratorOutputSchema>;
  review: z.infer<typeof ReviewerOutputSchema>;
  providerOverride?: string | null;
};

export async function runRevisor(input: RevisorInput) {
  const { model, provider } = getModelSafe(input.providerOverride);

  const system = `You are an endurance coach revising a training plan to address reviewer feedback.
Keep unchanged anything not flagged. Apply each suggested fix minimally - don't rewrite the whole plan.
Preserve the plan's ISO dates. Preserve the overall structure. Do not fabricate new events.
Return JSON strictly matching the schema (revisionSummary + full updated workouts list).`;

  const prompt = `Current plan:
${JSON.stringify(input.generated, null, 2)}

Reviewer feedback:
${JSON.stringify(input.review, null, 2)}

Produce the revised plan. Include every date from the original plan (even rest days).`;

  const { object } = await generateObject({
    model,
    schema: RevisorOutputSchema,
    system,
    prompt,
    temperature: 0.25,
    maxRetries: 2,
  });

  return { output: object, provider };
}
