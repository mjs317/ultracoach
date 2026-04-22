import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RestoreForm } from "./restore-form";

export default async function PlanHistoryPage() {
  const session = await auth();
  const plans = await prisma.plan.findMany({
    where: { userId: session!.user.id },
    orderBy: { version: "desc" },
    include: {
      _count: { select: { workouts: true, citations: true } },
    },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Plan history</h1>
          <p className="text-sm text-muted-foreground">
            Every regeneration creates a new version. You can make an older version active again.
          </p>
        </div>
        <Link href="/plan" className="text-sm underline">Back to plan</Link>
      </div>
      <div className="space-y-3">
        {plans.length === 0 ? (
          <div className="text-sm text-muted-foreground">No plans generated yet.</div>
        ) : (
          plans.map((p) => (
            <Card key={p.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    v{p.version} · {p.name}
                  </CardTitle>
                  <CardDescription>
                    {format(p.createdAt, "MMM d, yyyy HH:mm")} · {p._count.workouts} workouts ·{" "}
                    {p._count.citations} citations
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      p.status === "ACTIVE"
                        ? "default"
                        : p.status === "DRAFT"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {p.status}
                  </Badge>
                  {p.status !== "ACTIVE" ? <RestoreForm planId={p.id} /> : null}
                </div>
              </CardHeader>
              {p.reviewSummary ? (
                <CardContent className="text-sm text-muted-foreground">{p.reviewSummary}</CardContent>
              ) : null}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
