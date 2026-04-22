import { auth } from "@/auth";
import { generatePlan } from "@/lib/ai/orchestrator";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  const rl = await rateLimit(`gen:${session.user.id}`, 8, 3600);
  if (!rl.ok) {
    return new Response("Rate limit exceeded. Try again in an hour.", { status: 429 });
  }
  let providerOverride: string | null = null;
  try {
    const body = await req.json();
    providerOverride = body?.provider ?? null;
  } catch {
    /* ignore */
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      try {
        await generatePlan(session.user.id, {
          providerOverride,
          onProgress: (p) => send(p),
        });
        controller.close();
      } catch (err) {
        send({
          stage: "error",
          message: err instanceof Error ? err.message : "Unknown error",
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
