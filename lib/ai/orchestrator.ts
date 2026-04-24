import { prisma } from "@/lib/db";
import { runArchitect } from "@/lib/ai/agents/architect";
import { runGenerator } from "@/lib/ai/agents/generator";
import { runReviewer } from "@/lib/ai/agents/reviewer";
import { runRevisor } from "@/lib/ai/agents/revisor";
import { addDays, endOfDay, startOfDay } from "date-fns";
import type { Sport, WorkoutType, TrainingPhase } from "@prisma/client";

export type OrchestratorProgress =
  | { stage: "start"; provider: string }
  | { stage: "architect:done" }
  | { stage: "generator:done"; workoutCount: number }
  | { stage: "reviewer:done"; issues: number }
  | { stage: "revisor:done" }
  | { stage: "saved"; planId: string }
  | { stage: "error"; message: string };

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

  const architect = await runArchitect({
    profile,
    events,
    planStart,
    planEnd,
    providerOverride: opts.providerOverride,
  });
  onP({ stage: "architect:done" });

  const generated = await runGenerator({
    profile,
    events,
    architectPlan: architect.output,
    providerOverride: opts.providerOverride,
  });
  onP({ stage: "generator:done", workoutCount: generated.output.workouts.length });

  const review = await runReviewer({
    profile,
    events,
    generated: generated.output,
    providerOverride: opts.providerOverride,
  });
  onP({ stage: "reviewer:done", issues: review.output.issues.length });

  const final =
    review.output.issues.length > 0
      ? await runRevisor({
          generated: generated.output,
          review: review.output,
          providerOverride: opts.providerOverride,
        })
      : { output: { revisionSummary: "No revisions required.", workouts: generated.output.workouts } };
  onP({ stage: "revisor:done" });

  const existing = await prisma.plan.findFirst({
    where: { userId },
    orderBy: { version: "desc" },
  });
  const version = (existing?.version ?? 0) + 1;

  const plan = await prisma.plan.create({
    data: {
      userId,
      name: architect.output.planName,
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
        provider: architect.provider,
      },
      reviewSummary: review.output.summary,
      blocks: {
        create: architect.output.blocks.map((b, i) => ({
          name: b.name,
          phase: b.phase as TrainingPhase,
          startDate: new Date(b.startDate),
          endDate: new Date(b.endDate),
          focus: b.focus,
          orderIndex: i,
        })),
      },
      workouts: {
        create: final.output.workouts.map((w) => ({
          date: new Date(w.date),
          sport: w.sport as Sport,
          type: w.type as WorkoutType,
          title: w.title,
          description: w.description,
          durationSeconds: w.durationSeconds,
          distanceMeters: w.distanceMeters ?? null,
          estimatedTss: w.estimatedTss ?? null,
          steps: w.steps as unknown as object,
        })),
      },
      citations: {
        create: review.output.citations.map((c) => ({
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
