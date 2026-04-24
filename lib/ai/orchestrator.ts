import { prisma } from "@/lib/db";
import { runArchitect } from "@/lib/ai/agents/architect";
import { runGenerator } from "@/lib/ai/agents/generator";
import { runReviewer } from "@/lib/ai/agents/reviewer";
import { runRevisor } from "@/lib/ai/agents/revisor";
import { addDays, endOfDay, startOfDay, differenceInCalendarDays } from "date-fns";
import type { AthleteProfile, Event as DbEvent, Sport, WorkoutType, TrainingPhase } from "@prisma/client";
import type { z } from "zod";
import {
  ArchitectOutputSchema,
  GeneratorOutputSchema,
  ReviewerOutputSchema,
} from "@/lib/ai/schemas";

export type OrchestratorProgress =
  | { stage: "start"; provider: string }
  | { stage: "architect:done" }
  | { stage: "generator:done"; workoutCount: number }
  | { stage: "reviewer:done"; issues: number }
  | { stage: "revisor:done" }
  | { stage: "saved"; planId: string }
  | { stage: "error"; message: string };

type ArchitectOutput = z.infer<typeof ArchitectOutputSchema>;
type GeneratedOutput = z.infer<typeof GeneratorOutputSchema>;
type ReviewerOutput = z.infer<typeof ReviewerOutputSchema>;

function pickPrimarySport(events: DbEvent[]): Sport {
  const first = events[0]?.sport;
  if (first === "BIKE" || first === "SWIM" || first === "RUN" || first === "ULTRA") return first;
  if (first === "TRI") return "BIKE";
  if (first === "DUATHLON") return "RUN";
  return "RUN";
}

function fallbackArchitect(events: DbEvent[], planStart: Date, planEnd: Date): ArchitectOutput {
  const totalDays = Math.max(1, differenceInCalendarDays(planEnd, planStart) + 1);
  const buildEnd = addDays(planStart, Math.max(7, Math.floor(totalDays * 0.6)));
  const peakEnd = addDays(planStart, Math.max(10, Math.floor(totalDays * 0.85)));
  return {
    planName: events.length ? `${events[0].name} prep plan` : "Season plan",
    startDate: planStart.toISOString().slice(0, 10),
    endDate: planEnd.toISOString().slice(0, 10),
    rationale:
      "Fallback auto-plan generated from event dates. Add athlete profile data later to refine intensity and volume.",
    blocks: [
      {
        name: "Base / Build",
        phase: "BUILD",
        startDate: planStart.toISOString().slice(0, 10),
        endDate: buildEnd.toISOString().slice(0, 10),
        focus: "Build consistency and aerobic endurance with 3-5 sessions/week.",
      },
      {
        name: "Peak",
        phase: "PEAK",
        startDate: addDays(buildEnd, 1).toISOString().slice(0, 10),
        endDate: peakEnd.toISOString().slice(0, 10),
        focus: "Maintain volume and add race-specific quality sessions.",
      },
      {
        name: "Taper / Race",
        phase: "TAPER",
        startDate: addDays(peakEnd, 1).toISOString().slice(0, 10),
        endDate: planEnd.toISOString().slice(0, 10),
        focus: "Reduce load while keeping some intensity to stay sharp.",
      },
    ],
    weeklyGuidance: [
      {
        weekStart: planStart.toISOString().slice(0, 10),
        totalHours: 7,
        intensityMix: { easy: 0.8, moderate: 0.15, hard: 0.05 },
        notes: "Default guidance used because AI response failed schema validation.",
      },
    ],
  };
}

function fallbackWorkouts(
  events: DbEvent[],
  planStart: Date,
  planEnd: Date,
  profile: AthleteProfile | null
): GeneratedOutput {
  const primary = pickPrimarySport(events);
  const workouts: GeneratedOutput["workouts"] = [];
  const totalDays = Math.max(1, differenceInCalendarDays(planEnd, planStart) + 1);
  const maxLong = Math.min(3 * 3600, Math.max(75 * 60, Math.floor(totalDays / 7) * 10 * 60 + 75 * 60));
  const easyTarget = profile?.lthrBpm
    ? { type: "percent_lthr" as const, low: 65, high: 75, note: "Easy aerobic" }
    : { type: "rpe" as const, low: 2, high: 4, note: "Easy aerobic" };
  const hardTarget = profile?.lthrBpm
    ? { type: "percent_lthr" as const, low: 85, high: 92, note: "Tempo / threshold" }
    : { type: "rpe" as const, low: 6, high: 7, note: "Tempo / threshold" };

  for (let i = 0; i < totalDays; i++) {
    const date = addDays(planStart, i);
    const dow = date.getDay(); // 0 Sun ... 6 Sat
    const iso = date.toISOString().slice(0, 10);

    if (dow === 1) {
      workouts.push({
        date: iso,
        sport: primary,
        type: "REST",
        title: "Rest day",
        description: "Recovery day. Optional light mobility.",
        durationSeconds: 0,
        steps: [],
      });
      continue;
    }

    if (dow === 6) {
      const longDur = Math.min(maxLong, 90 * 60 + Math.floor(i / 7) * 10 * 60);
      workouts.push({
        date: iso,
        sport: primary,
        type: "LONG",
        title: "Long endurance session",
        description: "Steady aerobic work. Keep effort controlled and conversational.",
        durationSeconds: longDur,
        estimatedTss: Math.round(longDur / 60 / 2),
        steps: [
          { kind: "warmup", label: "Warm up", durationSeconds: 10 * 60, target: easyTarget },
          {
            kind: "main",
            label: "Steady endurance",
            durationSeconds: Math.max(20 * 60, longDur - 20 * 60),
            target: easyTarget,
          },
          { kind: "cooldown", label: "Cool down", durationSeconds: 10 * 60, target: easyTarget },
        ],
      });
      continue;
    }

    if (dow === 3) {
      workouts.push({
        date: iso,
        sport: primary,
        type: "THRESHOLD",
        title: "Tempo / threshold intervals",
        description: "Controlled quality session. Back off if fatigue is high.",
        durationSeconds: 60 * 60,
        estimatedTss: 70,
        steps: [
          { kind: "warmup", label: "Warm up", durationSeconds: 15 * 60, target: easyTarget },
          { kind: "interval", label: "3x8 min tempo", durationSeconds: 24 * 60, target: hardTarget },
          { kind: "recovery", label: "Easy between reps", durationSeconds: 6 * 60, target: easyTarget },
          { kind: "cooldown", label: "Cool down", durationSeconds: 15 * 60, target: easyTarget },
        ],
      });
      continue;
    }

    workouts.push({
      date: iso,
      sport: primary,
      type: "ENDURANCE",
      title: "Aerobic endurance",
      description: "Easy aerobic maintenance session.",
      durationSeconds: 45 * 60,
      estimatedTss: 35,
      steps: [
        { kind: "warmup", label: "Warm up", durationSeconds: 10 * 60, target: easyTarget },
        { kind: "main", label: "Endurance", durationSeconds: 30 * 60, target: easyTarget },
        { kind: "cooldown", label: "Cool down", durationSeconds: 5 * 60, target: easyTarget },
      ],
    });
  }

  return { workouts };
}

export async function generatePlan(
  userId: string,
  opts: {
    providerOverride?: string | null;
    onProgress?: (p: OrchestratorProgress) => void;
  } = {}
) {
  const onP = opts.onProgress ?? (() => {});

  const profile = await prisma.athleteProfile.findUnique({ where: { userId } });

  const events = await prisma.event.findMany({
    where: { userId },
    orderBy: { date: "asc" },
  });
  if (events.length === 0) throw new Error("Add at least one event first.");

  const now = new Date();
  const planStart = startOfDay(now);
  const lastEvent = events[events.length - 1];
  const planEnd = endOfDay(addDays(lastEvent.date, 3));

  onP({ stage: "start", provider: "resolving" });

  let architectProvider = "fallback";
  let architectOutput: ArchitectOutput;
  try {
    const architect = await runArchitect({
      profile,
      events,
      planStart,
      planEnd,
      providerOverride: opts.providerOverride,
    });
    architectProvider = architect.provider;
    architectOutput = architect.output;
  } catch {
    architectOutput = fallbackArchitect(events, planStart, planEnd);
  }
  onP({ stage: "architect:done" });

  let generatedOutput: GeneratedOutput;
  try {
    const generated = await runGenerator({
      profile,
      events,
      architectPlan: architectOutput,
      providerOverride: opts.providerOverride,
    });
    generatedOutput = generated.output;
  } catch {
    generatedOutput = fallbackWorkouts(events, planStart, planEnd, profile);
  }
  onP({ stage: "generator:done", workoutCount: generatedOutput.workouts.length });

  let reviewOutput: ReviewerOutput;
  try {
    const review = await runReviewer({
      profile,
      events,
      generated: generatedOutput,
      providerOverride: opts.providerOverride,
    });
    reviewOutput = review.output;
  } catch {
    reviewOutput = {
      summary:
        "Fallback review: AI reviewer response failed schema validation. Plan generated with default safety rules.",
      issues: [],
      citations: [],
    };
  }
  onP({ stage: "reviewer:done", issues: reviewOutput.issues.length });

  const final =
    reviewOutput.issues.length > 0
      ? await runRevisor({
          generated: generatedOutput,
          review: reviewOutput,
          providerOverride: opts.providerOverride,
        }).catch(() => ({
          output: { revisionSummary: "Skipped revision due to AI output mismatch.", workouts: generatedOutput.workouts },
        }))
      : { output: { revisionSummary: "No revisions required.", workouts: generatedOutput.workouts } };
  onP({ stage: "revisor:done" });

  const existing = await prisma.plan.findFirst({
    where: { userId },
    orderBy: { version: "desc" },
  });
  const version = (existing?.version ?? 0) + 1;

  const plan = await prisma.plan.create({
    data: {
      userId,
      name: architectOutput.planName,
      status: "ACTIVE",
      version,
      startDate: planStart,
      endDate: planEnd,
      inputsSnapshot: {
        eventIds: events.map((e) => e.id),
        profileSnapshot: profile
          ? {
              ftp: profile.ftpWatts,
              lthr: profile.lthrBpm,
              experience: profile.experienceLevel,
            }
          : null,
        provider: architectProvider,
      },
      reviewSummary: reviewOutput.summary,
      blocks: {
        create: architectOutput.blocks.map((b, i) => ({
          name: b.name,
          phase: b.phase as TrainingPhase,
          startDate: new Date(b.startDate),
          endDate: new Date(b.endDate),
          focus: b.focus ?? null,
          orderIndex: i,
        })),
      },
      workouts: {
        create: final.output.workouts.map((w) => ({
          date: new Date(w.date),
          sport: w.sport as Sport,
          type: w.type as WorkoutType,
          title: w.title,
          description: w.description ?? null,
          durationSeconds: w.durationSeconds,
          distanceMeters: w.distanceMeters ?? null,
          estimatedTss: w.estimatedTss ?? null,
          steps: w.steps as unknown as object,
        })),
      },
      citations: {
        create: reviewOutput.citations.map((c) => ({
          url: c.url,
          title: c.title,
          snippet: c.snippet ?? null,
          topic: c.topic ?? null,
        })),
      },
    },
  });

  if (existing) {
    await prisma.plan.updateMany({
      where: { userId, id: { not: plan.id }, status: "ACTIVE" },
      data: { status: "ARCHIVED" },
    });
  }

  onP({ stage: "saved", planId: plan.id });
  return plan;
}
