import { generateObject } from "ai";
import { getModelSafe } from "@/lib/ai/providers";
import { ReviewerOutputSchema } from "@/lib/ai/schemas";
import { searchWeb, type SearchResult } from "@/lib/science/search";
import type { AthleteProfile, Event as DbEvent } from "@prisma/client";
import type { z } from "zod";
import { GeneratorOutputSchema } from "@/lib/ai/schemas";

const REVIEW_TOPICS = [
  "polarized vs pyramidal intensity distribution endurance training 80/20",
  "acute chronic workload ratio injury risk endurance",
  "tapering duration marathon Ironman volume reduction",
  "long run weekly progression guidelines running",
  "recovery week frequency periodization endurance",
  "back-to-back long runs ultra marathon training",
  "sleep and recovery endurance athletes",
  "ramp rate volume increase 10 percent rule evidence",
];

export type ReviewerInput = {
  profile: AthleteProfile;
  events: DbEvent[];
  generated: z.infer<typeof GeneratorOutputSchema>;
  providerOverride?: string | null;
};

export async function runReviewer(input: ReviewerInput) {
  const { model, provider } = getModelSafe(input.providerOverride);

  const searchResults = await Promise.all(
    REVIEW_TOPICS.map(async (q) => ({ q, r: await searchWeb(q, 4) }))
  );

  const sourcesBlock = searchResults
    .flatMap(({ q, r }) =>
      r.map(
        (s, i) =>
          `[source ${q.slice(0, 40)} #${i + 1}] ${s.title}\n${s.url}\n${s.content?.slice(0, 900) ?? ""}`
      )
    )
    .join("\n\n---\n\n");

  const flatCitations: SearchResult[] = searchResults.flatMap(({ r }) => r);

  const system = `You are a sports-science reviewer. Audit the provided training plan against current evidence.
Look for issues in:
- Intensity distribution (target roughly 75-85% easy for endurance sports).
- Weekly volume ramp rate (no more than ~10% per loading week).
- Recovery weeks at reasonable cadence.
- Long-run/long-ride progression.
- Taper length and structure per event priority/distance.
- Two hard days back-to-back.
- Sport balance for multisport athletes.
- Injury/constraint compliance from the athlete profile.

Use ONLY the provided sources for citations. Each citation must include URL and a brief snippet.
Return JSON strictly matching the schema.`;

  const prompt = `Athlete:
${JSON.stringify({ experience: input.profile.experienceLevel, ftp: input.profile.ftpWatts, lthr: input.profile.lthrBpm, constraints: input.profile.constraints }, null, 2)}

Events:
${input.events.map((e) => `${e.date.toISOString().slice(0, 10)} ${e.sport} ${e.priority} ${e.name}`).join("\n")}

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

SOURCES (use for citations):
${sourcesBlock || "(no external sources available)"}
`;

  const { object } = await generateObject({
    model,
    schema: ReviewerOutputSchema,
    system,
    prompt,
    temperature: 0.2,
  });

  const citations =
    object.citations?.length > 0
      ? object.citations
      : flatCitations.slice(0, 6).map((s) => ({
          url: s.url,
          title: s.title,
          snippet: s.content.slice(0, 300),
          topic: "general",
        }));

  return { output: { ...object, citations }, provider };
}
