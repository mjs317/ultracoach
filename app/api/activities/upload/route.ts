import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { parseFitHeader, parseGpx, parseTcx } from "@/lib/parsers/activity-files";
import { linkActivitiesToWorkouts } from "@/lib/strava";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return new Response("Missing file", { status: 400 });

  const name = file.name.toLowerCase();
  let parsed;
  if (name.endsWith(".gpx")) parsed = parseGpx(await file.text());
  else if (name.endsWith(".tcx")) parsed = parseTcx(await file.text());
  else if (name.endsWith(".fit"))
    parsed = parseFitHeader(new Uint8Array(await file.arrayBuffer()));
  else return new Response("Unsupported file type", { status: 400 });

  await prisma.activity.create({
    data: {
      userId: session.user.id,
      source: "UPLOAD",
      externalId: `${file.name}-${file.size}`,
      name: parsed.name ?? file.name,
      sport: parsed.sport,
      startTime: parsed.startTime,
      durationSeconds: parsed.durationSeconds,
      distanceMeters: parsed.distanceMeters ?? null,
      elevationGainM: parsed.elevationGainM ?? null,
    },
  });

  await linkActivitiesToWorkouts(session.user.id);

  return Response.json({ ok: true });
}
