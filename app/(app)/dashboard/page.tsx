import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { format, isAfter, differenceInCalendarDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Sparkles } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [events, plan, profile] = await Promise.all([
    prisma.event.findMany({
      where: { userId },
      orderBy: { date: "asc" },
    }),
    prisma.plan.findFirst({
      where: { userId, status: { in: ["DRAFT", "ACTIVE"] } },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { workouts: true, citations: true } } },
    }),
    prisma.athleteProfile.findUnique({ where: { userId } }),
  ]);

  const upcoming = events.filter((e) => isAfter(e.date, new Date())).slice(0, 6);
  const nextA = events.find((e) => e.priority === "A" && isAfter(e.date, new Date()));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {session?.user?.email ? `Welcome back, ${session.user.email}.` : "Welcome back."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/events"><Plus className="mr-2 h-4 w-4" /> Add event</Link>
          </Button>
          <Button asChild disabled={events.length === 0}>
            <Link href="/plan">
              <Sparkles className="mr-2 h-4 w-4" />
              {plan ? "Open plan" : "Generate plan"}
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Next A event</CardTitle></CardHeader>
          <CardContent>
            {nextA ? (
              <div>
                <div className="text-lg font-semibold">{nextA.name}</div>
                <div className="text-sm text-muted-foreground">
                  {format(nextA.date, "MMM d, yyyy")} ·{" "}
                  {differenceInCalendarDays(nextA.date, new Date())} days away
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No A event yet.</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Season events</CardTitle></CardHeader>
          <CardContent className="flex items-baseline gap-2">
            <div className="text-3xl font-semibold">{events.length}</div>
            <div className="text-sm text-muted-foreground">planned</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Active plan</CardTitle></CardHeader>
          <CardContent>
            {plan ? (
              <div>
                <div className="font-semibold">{plan.name}</div>
                <div className="text-sm text-muted-foreground">
                  {plan._count.workouts} workouts · {plan._count.citations} citations · v{plan.version}
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No plan yet. Add events and click Generate plan.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Upcoming events</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/events"><Calendar className="mr-2 h-4 w-4" /> See all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <div className="text-sm text-muted-foreground">No upcoming events.</div>
          ) : (
            <ul className="divide-y">
              {upcoming.map((e) => (
                <li key={e.id} className="flex items-center justify-between py-2">
                  <div>
                    <div className="font-medium">{e.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(e.date, "EEE, MMM d, yyyy")} · {e.sport}
                    </div>
                  </div>
                  <Badge variant={e.priority === "A" ? "default" : e.priority === "B" ? "secondary" : "outline"}>
                    {e.priority}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
