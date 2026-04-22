import { generateObject } from "ai";
import { getModelSafe } from "@/lib/ai/providers";
import { GeneratorOutputSchema } from "@/lib/ai/schemas";
import type { Activity, AthleteProfile, Workout, WorkoutFeedback } from "@prisma/client";
import type { z } from "zod";

export type AdapterInput = {
  profile: AthleteProfile;
  existing: (Workout & { feedback: WorkoutFeedback | null })[];
  actuals?: Activity[];
  fromDate: Date;
  mode: "FEEDBACK" | "ACTUALS";
  providerOverride?: string | null;
};

/**
 * Revises future workouts (>= fromDate) based on recent feedback / actuals.
 * Past workouts are passed as context but not rewritten.
 */
export async function runAdapter(input: AdapterInput) {
  const { model, provider } = getModelSafe(input.providerOverride);

  const past = input.existing.filter((w) => w.date < input.fromDate);
  const future = input.existing.filter((w) => w.date >= input.fromDate);

  const feedbackSummary = past
    .filter((w) => w.feedback)
    .map((w) => {
      const f = w.feedback!;
      return `${w.date.toISOString().slice(0, 10)} ${w.sport} ${w.type} "${w.title}" -> completed=${f.completed} rpe=${f.rpe ?? "?"} soreness=${f.sorenessLevel ?? "?"} sleep=${f.sleepHours ?? "?"} notes="${f.notes ?? ""}"`;
    })
    .join("\n");

  const system = `You are an adaptive endurance coach revising only the FUTURE portion of an existing plan.
Principles:
- If the athlete has been skipping hard sessions or reporting high RPE/soreness, reduce intensity/volume in the next 7-14 days.
- If sleep is low or stress is high, insert extra recovery.
- If sessions have been easier than prescribed and recovery looks good, you may gently progress.
- Don't change the long-term structure: keep dates, phase, and sport distribution broadly similar.
- Preserve off-days and REST workouts.
Return JSON strictly matching the schema with the full list of FUTURE workouts (from ${input.fromDate.toISOString().slice(0, 10)} to end).`;

  const actualsSummary = (input.actuals ?? [])
    .filter((a) => a.startTime < input.fromDate)
    .slice(-30)
    .map(
      (a) =>
        `${a.startTime.toISOString().slice(0, 10)} ${a.sport} ${Math.round(a.durationSeconds / 60)}m${
          a.distanceMeters ? ` ${(a.distanceMeters / 1000).toFixed(1)}km` : ""
        }${a.averageHr ? ` avgHR=${a.averageHr}` : ""}${a.averagePower ? ` avgW=${a.averagePower}` : ""}`
    )
    .join("\n");

  const prompt = `Athlete profile summary:
- Experience: ${input.profile.experienceLevel}
- FTP: ${input.profile.ftpWatts ?? "n/a"}
- Constraints: ${input.profile.constraints ?? "none"}

Recent completed workouts with feedback:
${feedbackSummary || "(no feedback yet)"}

Recent imported actual activities (from Strava/uploads):
${actualsSummary || "(no actuals imported)"}

Current FUTURE workouts to revise:
${JSON.stringify(
  future.map((w) => ({
    date: w.date.toISOString().slice(0, 10),
    sport: w.sport,
    type: w.type,
    title: w.title,
    description: w.description,
    durationSeconds: w.durationSeconds,
    steps: w.steps,
  })),
  null,
  2
)}

Produce the revised future workouts now.`;

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

export type AdapterOutput = z.infer<typeof GeneratorOutputSchema>;
