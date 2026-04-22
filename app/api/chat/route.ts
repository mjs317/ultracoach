import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getModelSafe } from "@/lib/ai/providers";
import { streamText } from "ai";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const { messages, planId } = (await req.json()) as {
    messages: { role: "user" | "assistant" | "system"; content: string }[];
    planId?: string;
  };

  let planContext = "No active plan.";
  if (planId) {
    const plan = await prisma.plan.findFirst({
      where: { id: planId, userId: session.user.id },
      include: {
        workouts: { orderBy: { date: "asc" } },
        blocks: { orderBy: { orderIndex: "asc" } },
      },
    });
    if (plan) {
      planContext = `Active plan: ${plan.name} (v${plan.version})
Blocks:
${plan.blocks.map((b) => `- ${b.phase} ${b.startDate.toISOString().slice(0, 10)}->${b.endDate.toISOString().slice(0, 10)}: ${b.focus ?? ""}`).join("\n")}

Upcoming workouts (next 21):
${plan.workouts
  .filter((w) => w.date >= new Date())
  .slice(0, 21)
  .map((w) => `${w.date.toISOString().slice(0, 10)} ${w.sport} ${w.type} ${w.title} (${Math.round(w.durationSeconds / 60)}m)`)
  .join("\n")}`;
    }
  }

  const settings = await prisma.userSettings.findUnique({
    where: { userId: session.user.id },
  });
  const { model } = getModelSafe(settings?.aiProvider);

  const system = `You are an athlete's endurance coach chatting about their plan.
Be concise, practical, and cite training-science principles when relevant.
If the athlete asks to change a workout or shift a block, describe the proposed change clearly
and tell them to click "Regenerate" in the plan view to apply structural changes, or edit the
workout directly for small tweaks.
Current plan context:
${planContext}`;

  const result = streamText({
    model,
    system,
    messages,
    temperature: 0.5,
  });

  return result.toDataStreamResponse();
}
