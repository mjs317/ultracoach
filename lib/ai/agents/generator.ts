import { generateObject } from "ai";
import { getModelSafe } from "@/lib/ai/providers";
import { GeneratorOutputSchema } from "@/lib/ai/schemas";
import { buildAthleteContext, buildEventsContext } from "@/lib/ai/context";
import type { AthleteProfile, Event as DbEvent } from "@prisma/client";
import type { z } from "zod";
import { ArchitectOutputSchema } from "@/lib/ai/schemas";

export type GeneratorInput = {
  profile: AthleteProfile | null;
  events: DbEvent[];
  architectPlan: z.infer<typeof ArchitectOutputSchema>;
  providerOverride?: string | null;
};

export async function runGenerator(input: GeneratorInput) {
  const { model, provider } = getModelSafe(input.providerOverride);

  const system = `You translate a periodization outline into concrete daily structured workouts.
Each workout must:
- Have an ISO date (yyyy-mm-dd).
- Be one of the defined sports and workout types.
- Include "steps" - an ordered list of structured steps with durations in seconds (and/or distances in meters).
- Use interval targets as one of: percent_ftp, watts, percent_lthr, bpm, hr_zone, pace_per_km, pace_per_mile, rpe, open.
- Include reasonable durationSeconds (overall) and optional estimatedTss.
- Respect the athlete's equipment: if hasPowerMeter or smart trainer is true, prefer percent_ftp/watts for bike intervals; if hasHeartRate is true, prefer percent_lthr or hr_zone for run intervals; otherwise RPE.
- Respect off-days and weekly hours pattern.
- Include brick workouts for triathlons, long easy sessions each week, and one quality session per discipline when possible.
- Race-week workouts should be short and sharpening.
- Do not place two hard days back-to-back.
Return JSON strictly matching the schema; no prose outside the JSON.`;

  const prompt = `${buildAthleteContext(input.profile)}

${buildEventsContext(input.events)}

Periodization outline:
${JSON.stringify(input.architectPlan, null, 2)}

Now produce the full list of workouts for the whole plan window. Prefer to include every day (mark off-days as REST with empty steps and 0 duration).`;

  const { object } = await generateObject({
    model,
    schema: GeneratorOutputSchema,
    system,
    prompt,
    temperature: 0.3,
    maxRetries: 2,
  });

  return { output: object, provider };
}
