import { auth } from "@/auth";
import { syncStravaActivities } from "@/lib/strava";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  const body = await req.json().catch(() => ({}));
  const days = Math.max(1, Math.min(365, Number(body?.days ?? 30)));
  const imported = await syncStravaActivities(session.user.id, days);
  return Response.json({ ok: true, imported });
}
