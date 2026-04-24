import { generateObject } from "ai";
import { getModelSafe } from "@/lib/ai/providers";
import { ReviewerOutputSchema, GeneratorOutputSchema } from "@/lib/ai/schemas";
import type { AthleteProfile, Event as DbEvent } from "@prisma/client";
import type { z } from "zod";

export type ReviewerInput = {
  profile: AthleteProfile | null;
  events: DbEvent[];
  generated: z.infer<typeof GeneratorOutputSchema>;
  providerOverride?: string | null;
};

export async function runReviewer(input: ReviewerInput) {
  const { model, provider } = getModelSafe(input.providerOverride);

  const system = `You are a sports-science reviewer. Audit the provided training plan against
established endurance training principles.

Look for issues in:
- Intensity distribution (target roughly 75-85% easy for endurance sports).
- Weekly volume ramp rate (no more than ~10% per loading week).
- Recovery weeks at a reasonable cadence (typically every 3-4 weeks).
- Long-run / long-ride progression.
- Taper length and structure scaled to event priority and distance.
- Two hard days back-to-back without justification.
- Sport balance for multisport athletes.
- Compliance with injuries / constraints from the athlete profile.

For citations, only reference well-known sources you are confident about
(e.g. "Seiler 2010" for polarized training, "ACSM guidelines", "Banister
TRIMP", a specific textbook chapter). Put the reference handle in the
url field and a one-sentence quote in the snippet field. If you are not
certain about a specific reference, leave the citations array empty
rather than fabricating URLs or papers.

Return JSON strictly matching the schema.`;

  const prompt = `Athlete:
${JSON.stringify(
  input.profile
    ? {
        experience: input.profile.experienceLevel,
        ftp: input.profile.ftpWatts,
        lthr: input.profile.lthrBpm,
        constraints: input.profile.constraints,
      }
    : { note: "No athlete profile on file; judge plan on general principles only." },
  null,
  2
)}

Events:
${input.events
  .map((e) => `${e.date.toISOString().slice(0, 10)} ${e.sport} ${e.priority} ${e.name}`)
  .join("\n")}

Plan (workouts):
${JSON.stringify(
  input.generated.workouts.map((w) => ({
    date: w.date,
    sport: w.sport,
    type: w.type,
    title: w.title,
    durationSeconds: w.durationSeconds,
  })),
  null,
  2
)}
`;

  const { object } = await generateObject({
    model,
    schema: ReviewerOutputSchema,
    system,
    prompt,
    temperature: 0.2,
  });

  return { output: object, provider };
}
