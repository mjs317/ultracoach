import { prisma } from "@/lib/db";
import { workoutsToIcs } from "@/lib/exports/ics";
import type { WorkoutStep } from "@/lib/ai/schemas";
import type { ExportWorkout } from "@/lib/exports/types";
import crypto from "crypto";

/**
 * Deterministic, per-user subscribable ICS feed. The token is
 * sha256(userId + AUTH_SECRET) so it's stable but not guessable.
 * Users find their URL on the /exports page.
 */
export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const secret = process.env.AUTH_SECRET ?? "dev-secret";
  const users = await prisma.user.findMany({ select: { id: true } });
  const match = users.find(
    (u) =>
      crypto.createHash("sha256").update(u.id + secret).digest("hex") === token
  );
  if (!match) return new Response("Not found", { status: 404 });

  const plan = await prisma.plan.findFirst({
    where: { userId: match.id, status: { in: ["DRAFT", "ACTIVE"] } },
    orderBy: { updatedAt: "desc" },
    include: { workouts: { orderBy: { date: "asc" } } },
  });

  if (!plan) return new Response("No active plan", { status: 404 });

  const exportWorkouts: ExportWorkout[] = plan.workouts.map((w) => ({
    id: w.id,
    title: w.title,
    description: w.description,
    date: w.date,
    sport: w.sport,
    type: w.type,
    durationSeconds: w.durationSeconds,
    distanceMeters: w.distanceMeters,
    estimatedTss: w.estimatedTss,
    steps: (w.steps as unknown as WorkoutStep[]) ?? [],
  }));

  const ics = workoutsToIcs(exportWorkouts);
  return new Response(ics, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "cache-control": "public, max-age=600",
    },
  });
}
