"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { WorkoutTypeSchema, SportSchema, StepSchema } from "@/lib/ai/schemas";

const updateWorkoutSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  sport: SportSchema.optional(),
  type: WorkoutTypeSchema.optional(),
  durationSeconds: z.number().int().nonnegative().optional(),
  distanceMeters: z.number().int().nonnegative().nullable().optional(),
  steps: z.array(StepSchema).optional(),
  completed: z.boolean().optional(),
});

export async function updateWorkout(workoutId: string, input: unknown) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not signed in");
  const data = updateWorkoutSchema.parse(input);

  const w = await prisma.workout.findUnique({
    where: { id: workoutId },
    include: { plan: { select: { userId: true } } },
  });
  if (!w || w.plan.userId !== session.user.id) throw new Error("Not found");

  await prisma.workout.update({
    where: { id: workoutId },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.sport !== undefined ? { sport: data.sport } : {}),
      ...(data.type !== undefined ? { type: data.type } : {}),
      ...(data.durationSeconds !== undefined ? { durationSeconds: data.durationSeconds } : {}),
      ...(data.distanceMeters !== undefined ? { distanceMeters: data.distanceMeters } : {}),
      ...(data.steps !== undefined ? { steps: data.steps as unknown as object } : {}),
      ...(data.completed !== undefined ? { completed: data.completed } : {}),
      userEdits: { at: new Date().toISOString() },
    },
  });

  revalidatePath("/plan");
  return { ok: true };
}

const feedbackSchema = z.object({
  completed: z.boolean(),
  rpe: z.number().int().min(1).max(10).optional().nullable(),
  actualDurationSec: z.number().int().nonnegative().optional().nullable(),
  sorenessLevel: z.number().int().min(1).max(10).optional().nullable(),
  sleepHours: z.number().min(0).max(24).optional().nullable(),
  stress: z.number().int().min(1).max(10).optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
});

export async function saveFeedback(workoutId: string, input: unknown) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not signed in");
  const data = feedbackSchema.parse(input);

  const w = await prisma.workout.findUnique({
    where: { id: workoutId },
    include: { plan: { select: { userId: true } } },
  });
  if (!w || w.plan.userId !== session.user.id) throw new Error("Not found");

  await prisma.workoutFeedback.upsert({
    where: { workoutId },
    update: {
      completed: data.completed,
      rpe: data.rpe ?? null,
      actualDurationSec: data.actualDurationSec ?? null,
      sorenessLevel: data.sorenessLevel ?? null,
      sleepHours: data.sleepHours ?? null,
      stress: data.stress ?? null,
      notes: data.notes ?? null,
    },
    create: {
      workoutId,
      completed: data.completed,
      rpe: data.rpe ?? null,
      actualDurationSec: data.actualDurationSec ?? null,
      sorenessLevel: data.sorenessLevel ?? null,
      sleepHours: data.sleepHours ?? null,
      stress: data.stress ?? null,
      notes: data.notes ?? null,
    },
  });

  await prisma.workout.update({
    where: { id: workoutId },
    data: { completed: data.completed },
  });

  revalidatePath("/plan");
  return { ok: true };
}
