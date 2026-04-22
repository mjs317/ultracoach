import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import JSZip from "jszip";
import { workoutToZwo } from "@/lib/exports/zwo";
import { workoutToErg } from "@/lib/exports/erg-mrc";
import { workoutToFit } from "@/lib/exports/fit";
import { workoutsToIcs } from "@/lib/exports/ics";
import { renderPlanPdf } from "@/lib/exports/pdf";
import type { AthleteCtx, ExportWorkout } from "@/lib/exports/types";
import type { WorkoutStep } from "@/lib/ai/schemas";

export const runtime = "nodejs";

function slugify(s: string) {
  return s.replace(/[^a-z0-9]+/gi, "-").replace(/(^-|-$)/g, "").toLowerCase() || "workout";
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ format: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const workoutIds = url.searchParams.getAll("workoutIds").flatMap((v) => v.split(","));
  const planId = url.searchParams.get("planId") ?? undefined;
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const { format } = await params;

  const where: Record<string, unknown> = { plan: { userId: session.user.id } };
  if (workoutIds.length) where.id = { in: workoutIds };
  else if (planId) where.planId = planId;
  if (from) where.date = { ...(where.date as object), gte: new Date(from) };
  if (to) where.date = { ...(where.date as object), lte: new Date(to) };

  const profile = await prisma.athleteProfile.findUnique({
    where: { userId: session.user.id },
  });
  const ctx: AthleteCtx = {
    ftpWatts: profile?.ftpWatts ?? null,
    lthrBpm: profile?.lthrBpm ?? null,
    maxHrBpm: profile?.maxHrBpm ?? null,
    thresholdRunPaceSecPerKm: profile?.thresholdRunPaceSecPerKm ?? null,
  };

  const workouts = await prisma.workout.findMany({
    where,
    orderBy: { date: "asc" },
  });

  if (workouts.length === 0) {
    return new Response("No workouts found for that selection.", { status: 404 });
  }

  const exportWorkouts: ExportWorkout[] = workouts.map((w) => ({
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

  const plan = workouts[0]?.planId
    ? await prisma.plan.findUnique({ where: { id: workouts[0].planId } })
    : null;
  const planName = plan?.name ?? "Ultracoach Plan";

  try {
    switch (format) {
      case "pdf": {
        const buf = await renderPlanPdf(planName, exportWorkouts);
        return new Response(new Uint8Array(buf), {
          headers: {
            "content-type": "application/pdf",
            "content-disposition": `attachment; filename="${slugify(planName)}.pdf"`,
          },
        });
      }
      case "ics": {
        const content = workoutsToIcs(exportWorkouts);
        return new Response(content, {
          headers: {
            "content-type": "text/calendar; charset=utf-8",
            "content-disposition": `attachment; filename="${slugify(planName)}.ics"`,
          },
        });
      }
      case "zwo":
      case "erg":
      case "mrc":
      case "fit": {
        if (exportWorkouts.length === 1) {
          const w = exportWorkouts[0];
          const name = `${w.date.toISOString().slice(0, 10)}-${slugify(w.title)}`;
          if (format === "zwo") {
            return new Response(workoutToZwo(w), {
              headers: {
                "content-type": "application/xml",
                "content-disposition": `attachment; filename="${name}.zwo"`,
              },
            });
          }
          if (format === "erg" || format === "mrc") {
            return new Response(workoutToErg(w, ctx, format), {
              headers: {
                "content-type": "text/plain",
                "content-disposition": `attachment; filename="${name}.${format}"`,
              },
            });
          }
          const fit = workoutToFit(w, ctx);
          return new Response(new Blob([fit as BlobPart]), {
            headers: {
              "content-type": "application/octet-stream",
              "content-disposition": `attachment; filename="${name}.fit"`,
            },
          });
        }
        // Multi-workout: zip them up
        const zip = new JSZip();
        for (const w of exportWorkouts) {
          const base = `${w.date.toISOString().slice(0, 10)}-${slugify(w.title)}`;
          if (format === "zwo") zip.file(`${base}.zwo`, workoutToZwo(w));
          else if (format === "erg") zip.file(`${base}.erg`, workoutToErg(w, ctx, "erg"));
          else if (format === "mrc") zip.file(`${base}.mrc`, workoutToErg(w, ctx, "mrc"));
          else zip.file(`${base}.fit`, workoutToFit(w, ctx));
        }
        const buf = await zip.generateAsync({ type: "nodebuffer" });
        return new Response(new Uint8Array(buf), {
          headers: {
            "content-type": "application/zip",
            "content-disposition": `attachment; filename="${slugify(planName)}-${format}.zip"`,
          },
        });
      }
      case "bundle": {
        const zip = new JSZip();
        for (const w of exportWorkouts) {
          const base = `${w.date.toISOString().slice(0, 10)}-${slugify(w.title)}`;
          zip.file(`zwo/${base}.zwo`, workoutToZwo(w));
          zip.file(`erg/${base}.erg`, workoutToErg(w, ctx, "erg"));
          zip.file(`mrc/${base}.mrc`, workoutToErg(w, ctx, "mrc"));
          zip.file(`fit/${base}.fit`, workoutToFit(w, ctx));
        }
        zip.file(`${slugify(planName)}.ics`, workoutsToIcs(exportWorkouts));
        const pdfBuf = await renderPlanPdf(planName, exportWorkouts);
        zip.file(`${slugify(planName)}.pdf`, pdfBuf);
        const buf = await zip.generateAsync({ type: "nodebuffer" });
        return new Response(new Uint8Array(buf), {
          headers: {
            "content-type": "application/zip",
            "content-disposition": `attachment; filename="${slugify(planName)}-bundle.zip"`,
          },
        });
      }
      default:
        return new Response(`Unknown format: ${format}`, { status: 400 });
    }
  } catch (err) {
    return new Response(
      `Export failed: ${err instanceof Error ? err.message : String(err)}`,
      { status: 500 }
    );
  }
}
