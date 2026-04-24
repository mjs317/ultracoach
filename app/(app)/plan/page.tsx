import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { PlanClient } from "./plan-client";
import { Button } from "@/components/ui/button";

export default async function PlanPage() {
  const session = await auth();
  const userId = session!.user.id;

  const plan = await prisma.plan.findFirst({
    where: { userId, status: { in: ["DRAFT", "ACTIVE"] } },
    orderBy: { updatedAt: "desc" },
    include: {
      workouts: {
        orderBy: { date: "asc" },
        include: { feedback: true },
      },
      blocks: { orderBy: { orderIndex: "asc" } },
      citations: true,
    },
  });

  const events = await prisma.event.findMany({
    where: { userId },
    orderBy: { date: "asc" },
  });

  if (events.length === 0) {
    return (
      <div className="mx-auto max-w-xl text-center">
        <h1 className="mb-2 text-2xl font-semibold">Add at least one event</h1>
        <p className="mb-4 text-muted-foreground">
          The coach needs at least one target event to build your season around.
        </p>
        <Button asChild><Link href="/events">Add events</Link></Button>
      </div>
    );
  }

  return (
    <PlanClient
      plan={
        plan
          ? {
              id: plan.id,
              name: plan.name,
              version: plan.version,
              reviewSummary: plan.reviewSummary,
              startDate: plan.startDate.toISOString(),
              endDate: plan.endDate.toISOString(),
              workouts: plan.workouts.map((w) => ({
                id: w.id,
                date: w.date.toISOString(),
                sport: w.sport,
                type: w.type,
                title: w.title,
                description: w.description,
                durationSeconds: w.durationSeconds,
                distanceMeters: w.distanceMeters,
                estimatedTss: w.estimatedTss,
                steps: w.steps as unknown,
                completed: w.completed,
                feedback: w.feedback
                  ? {
                      completed: w.feedback.completed,
                      rpe: w.feedback.rpe,
                      actualDurationSec: w.feedback.actualDurationSec,
                      sorenessLevel: w.feedback.sorenessLevel,
                      sleepHours: w.feedback.sleepHours,
                      stress: w.feedback.stress,
                      notes: w.feedback.notes,
                    }
                  : null,
              })),
              blocks: plan.blocks.map((b) => ({
                id: b.id,
                name: b.name,
                phase: b.phase,
                startDate: b.startDate.toISOString(),
                endDate: b.endDate.toISOString(),
                focus: b.focus,
              })),
              citations: plan.citations.map((c) => ({
                id: c.id,
                url: c.url,
                title: c.title,
                snippet: c.snippet,
                topic: c.topic,
              })),
            }
          : null
      }
    />
  );
}
