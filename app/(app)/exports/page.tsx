import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import crypto from "crypto";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { ExportCenter } from "./exports-client";
import { headers } from "next/headers";

export default async function ExportsPage() {
  const session = await auth();
  const userId = session!.user.id;

  const plan = await prisma.plan.findFirst({
    where: { userId, status: { in: ["DRAFT", "ACTIVE"] } },
    orderBy: { updatedAt: "desc" },
    include: { workouts: { select: { id: true, date: true, title: true, sport: true, type: true } } },
  });

  const hdrs = await headers();
  const host = hdrs.get("host") ?? "localhost:3000";
  const proto = hdrs.get("x-forwarded-proto") ?? "http";
  const token = crypto
    .createHash("sha256")
    .update(userId + (process.env.AUTH_SECRET ?? "dev-secret"))
    .digest("hex");
  const feedUrl = `${proto}://${host}/api/calendar/${token}`;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Export center</h1>
        <p className="text-sm text-muted-foreground">
          Download your plan as structured workout files for TrainingPeaks, as a printable PDF, or
          subscribe to a live calendar feed.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Calendar subscription</CardTitle>
          <CardDescription>
            Add this URL to Google Calendar, Apple Calendar, or TrainingPeaks' calendar import.
            Workouts stay in sync as you regenerate.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <code className="block overflow-x-auto rounded-md border bg-muted/40 px-3 py-2 text-xs">
            {feedUrl}
          </code>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={feedUrl}>Download .ics once</Link>
            </Button>
            <Button asChild size="sm">
              <a href={`webcal://${feedUrl.replace(/^https?:\/\//, "")}`}>
                Subscribe in calendar app
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {plan ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Bundle export</CardTitle>
              <CardDescription>
                Zip with .zwo, .erg, .mrc, .fit, .ics, and PDF for the entire plan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <a href={`/api/export/bundle?planId=${plan.id}`} download>
                  <FileDown className="mr-2 h-4 w-4" /> Download full bundle
                </a>
              </Button>
            </CardContent>
          </Card>

          <ExportCenter
            planId={plan.id}
            workouts={plan.workouts.map((w) => ({
              id: w.id,
              date: w.date.toISOString(),
              title: w.title,
              sport: w.sport,
              type: w.type,
            }))}
          />
        </>
      ) : (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Generate a plan first, then come back to export.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
