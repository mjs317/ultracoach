import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { runAdapter } from "@/lib/ai/agents/adapter";
import { rateLimit } from "@/lib/rate-limit";
import { revalidatePath } from "next/cache";
import type { Sport, WorkoutType } from "@prisma/client";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const rl = await rateLimit(`adapt:${session.user.id}`, 20, 3600);
  if (!rl.ok) return new Response("Rate limit exceeded.", { status: 429 });

  const { fromDate } = (await req.json()) as { fromDate?: string };
  const from = fromDate ? new Date(fromDate) : new Date();

  const profile = await prisma.athleteProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) return new Response("Profile missing", { status: 400 });

  const plan = await prisma.plan.findFirst({
    where: { userId: session.user.id, status: { in: ["DRAFT", "ACTIVE"] } },
    orderBy: { updatedAt: "desc" },
    include: { workouts: { include: { feedback: true }, orderBy: { date: "asc" } } },
  });
  if (!plan) return new Response("No active plan", { status: 400 });

  const settings = await prisma.userSettings.findUnique({
    where: { userId: session.user.id },
  });
  const mode = settings?.adaptMode === "ACTUALS" ? "ACTUALS" : "FEEDBACK";

  const actuals =
    mode === "ACTUALS"
      ? await prisma.activity.findMany({
          where: { userId: session.user.id },
          orderBy: { startTime: "desc" },
          take: 100,
        })
      : [];

  const { output } = await runAdapter({
    profile,
    existing: plan.workouts,
    actuals,
    fromDate: from,
    mode,
    providerOverride: settings?.aiProvider ?? null,
  });

  const byDate = new Map<string, (typeof output.workouts)[number]>();
  for (const w of output.workouts) byDate.set(w.date, w);

  const future = plan.workouts.filter((w) => w.date >= from);
  await prisma.$transaction(async (tx) => {
    for (const w of future) {
      const key = w.date.toISOString().slice(0, 10);
      const next = byDate.get(key);
      if (!next) continue;
      await tx.workout.update({
        where: { id: w.id },
        data: {
          title: next.title,
          description: next.description,
          sport: next.sport as Sport,
          type: next.type as WorkoutType,
          durationSeconds: next.durationSeconds,
          distanceMeters: next.distanceMeters ?? null,
          steps: next.steps as unknown as object,
          userEdits: { adaptedAt: new Date().toISOString() },
        },
      });
    }
  });

  revalidatePath("/plan");
  revalidatePath("/dashboard");

  return Response.json({ ok: true, revised: future.length });
}
