import { generateObject } from "ai";
import { getModelSafe } from "@/lib/ai/providers";
import { ArchitectOutputSchema } from "@/lib/ai/schemas";
import { buildAthleteContext, buildEventsContext } from "@/lib/ai/context";
import type { AthleteProfile, Event as DbEvent } from "@prisma/client";

export type ArchitectInput = {
  profile: AthleteProfile | null;
  events: DbEvent[];
  planStart: Date;
  planEnd: Date;
  providerOverride?: string | null;
};

export async function runArchitect(input: ArchitectInput) {
  const { model, provider } = getModelSafe(input.providerOverride);

  const system = `You are a world-class endurance coach who designs multi-sport periodization.
Given an athlete profile, a set of target events, a weekly-hours pattern, and a season window,
produce a high-level periodization outline with training blocks (BASE, BUILD, PEAK, TAPER, RECOVERY, RACE_WEEK)
and per-week guidance (total hours and easy/moderate/hard intensity mix).

Principles to apply:
- Prioritize A events; taper 10-21 days depending on race distance and priority.
- Recovery weeks every 3-4 weeks (reduce volume 20-35%).
- Respect polarized or pyramidal intensity distribution (typically 75-85% easy).
- Ramp weekly volume no more than ~10% between loading weeks.
- Respect the athlete's off days and weekly hours pattern.
- For ultra events, build long workouts progressively with back-to-back weekends near peak.
Return JSON strictly matching the schema.`;

  const prompt = `${buildAthleteContext(input.profile)}

${buildEventsContext(input.events)}

Plan window: ${input.planStart.toISOString().slice(0, 10)} to ${input.planEnd.toISOString().slice(0, 10)}.
Now produce the periodization outline.`;

  const { object } = await generateObject({
    model,
    schema: ArchitectOutputSchema,
    system,
    prompt,
    temperature: 0.4,
  });

  return { output: object, provider };
}
