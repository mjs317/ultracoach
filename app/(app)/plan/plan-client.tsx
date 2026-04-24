"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  addDays,
  differenceInCalendarDays,
  endOfWeek,
  format,
  parseISO,
  startOfWeek,
} from "date-fns";
import {
  BookOpen,
  Bike,
  Dumbbell,
  MessageCircle,
  PersonStanding,
  RefreshCw,
  Sparkles,
  Waves,
  Activity as Run,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WorkoutDrawer } from "./workout-drawer";
import { ChatDrawer } from "./chat-drawer";
import { formatDuration } from "@/lib/utils";

type Step = {
  kind: string;
  label: string;
  durationSeconds?: number;
  distanceMeters?: number;
  target?: { type: string; low?: number; high?: number; value?: number; note?: string };
  cadenceRpm?: number;
  repeat?: number;
  children?: Step[];
};

export type WorkoutRow = {
  id: string;
  date: string;
  sport: string;
  type: string;
  title: string;
  description: string | null;
  durationSeconds: number;
  distanceMeters: number | null;
  estimatedTss: number | null;
  steps: unknown;
  completed: boolean;
  feedback: {
    completed: boolean;
    rpe: number | null;
    actualDurationSec: number | null;
    sorenessLevel: number | null;
    sleepHours: number | null;
    stress: number | null;
    notes: string | null;
  } | null;
};

export type PlanData = {
  id: string;
  name: string;
  version: number;
  reviewSummary: string | null;
  startDate: string;
  endDate: string;
  workouts: WorkoutRow[];
  blocks: {
    id: string;
    name: string;
    phase: string;
    startDate: string;
    endDate: string;
    focus: string | null;
  }[];
  citations: {
    id: string;
    url: string;
    title: string;
    snippet: string | null;
    topic: string | null;
  }[];
};

export function PlanClient({ plan }: { plan: PlanData | null }) {
  const [regenerating, setRegenerating] = React.useState(false);
  const [progress, setProgress] = React.useState<string[]>([]);
  const [progressOpen, setProgressOpen] = React.useState(false);
  const [selectedWorkout, setSelectedWorkout] = React.useState<WorkoutRow | null>(null);
  const [showCitations, setShowCitations] = React.useState(false);
  const [chatOpen, setChatOpen] = React.useState(false);

  async function regenerate() {
    setRegenerating(true);
    setProgress([]);
    setProgressOpen(true);
    try {
      const res = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok || !res.body) throw new Error("Failed to start generation");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let sawSaved = false;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const chunk of parts) {
          const line = chunk.trim();
          if (!line.startsWith("data:")) continue;
          let data: { stage?: string; message?: string; [k: string]: unknown } | null = null;
          try {
            data = JSON.parse(line.slice(5).trim());
          } catch {
            // Ignore malformed SSE payloads.
            continue;
          }
          if (!data || typeof data.stage !== "string") continue;
          if (data.stage === "error") {
            throw new Error(data.message || "Generation failed");
          }
          if (data.stage === "saved") {
            sawSaved = true;
          }
          setProgress((p) => [...p, formatStage(data as { stage: string; [k: string]: unknown })]);
        }
      }
      if (!sawSaved) {
        throw new Error("Plan generation did not complete. Please try again.");
      }
      toast.success("Plan generated");
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setRegenerating(false);
    }
  }

  if (!plan) {
    return (
      <div className="mx-auto max-w-xl text-center">
        <h1 className="mb-2 text-2xl font-semibold">No plan yet</h1>
        <p className="mb-4 text-muted-foreground">
          Click the button to build one. The AI coach will periodize your season, generate
          structured workouts, and review the plan against training-science principles. You
          can generate a plan from just your events — fill in your athlete profile later to
          refine thresholds and weekly hours.
        </p>
        <Button onClick={regenerate} disabled={regenerating}>
          <Sparkles className="mr-2 h-4 w-4" /> {regenerating ? "Generating..." : "Generate plan"}
        </Button>
        <ProgressDialog open={progressOpen} onOpenChange={setProgressOpen} progress={progress} />
      </div>
    );
  }

  const weeks = groupByWeek(plan.workouts);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{plan.name}</h1>
            <p className="text-sm text-muted-foreground">
              v{plan.version} · {format(parseISO(plan.startDate), "MMM d")} -{" "}
              {format(parseISO(plan.endDate), "MMM d, yyyy")} · {plan.workouts.length} workouts
            </p>
          </div>
          <div className="flex gap-2">
            {plan.citations.length > 0 ? (
              <Button variant="outline" size="sm" onClick={() => setShowCitations((s) => !s)}>
                <BookOpen className="mr-2 h-4 w-4" /> Citations ({plan.citations.length})
              </Button>
            ) : null}
            <Button asChild variant="outline" size="sm">
              <Link href="/plan/history">History</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setChatOpen(true)}>
              <MessageCircle className="mr-2 h-4 w-4" /> Chat coach
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  const res = await fetch("/api/adapt-plan", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ fromDate: new Date().toISOString() }),
                  });
                  if (!res.ok) throw new Error(await res.text());
                  toast.success("Future workouts adapted");
                  setTimeout(() => window.location.reload(), 500);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Failed");
                }
              }}
              disabled={regenerating}
            >
              Adapt upcoming
            </Button>
            <Button size="sm" onClick={regenerate} disabled={regenerating}>
              <RefreshCw className="mr-2 h-4 w-4" /> Regenerate
            </Button>
          </div>
        </div>

        {plan.reviewSummary ? (
          <Card className="mb-4">
            <CardHeader><CardTitle className="text-sm">Science review summary</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">{plan.reviewSummary}</CardContent>
          </Card>
        ) : null}

        {showCitations ? (
          <Card className="mb-4">
            <CardHeader><CardTitle className="text-sm">Cited sources</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {plan.citations.length === 0 ? (
                <div className="text-sm text-muted-foreground">No citations recorded.</div>
              ) : (
                plan.citations.map((c) => {
                  const isUrl = /^https?:\/\//i.test(c.url);
                  return (
                    <div key={c.id} className="text-sm">
                      {isUrl ? (
                        <Link
                          href={c.url}
                          target="_blank"
                          className="font-medium underline underline-offset-2"
                        >
                          {c.title}
                        </Link>
                      ) : (
                        <span className="font-medium">{c.title}</span>
                      )}
                      {!isUrl && c.url ? (
                        <span className="ml-2 text-xs text-muted-foreground">{c.url}</span>
                      ) : null}
                      {c.topic ? (
                        <span className="ml-2 text-xs text-muted-foreground">({c.topic})</span>
                      ) : null}
                      {c.snippet ? (
                        <div className="mt-1 text-xs text-muted-foreground">{c.snippet}</div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        ) : null}

        <div className="space-y-3">
          {weeks.map((w) => (
            <WeekCard
              key={w.weekStart}
              week={w}
              onSelect={setSelectedWorkout}
              blocks={plan.blocks}
            />
          ))}
        </div>
      </div>

      <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
        <Card>
          <CardHeader><CardTitle className="text-sm">Training blocks</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {plan.blocks.map((b) => (
              <div key={b.id} className="rounded-md border p-2">
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>{b.name}</span>
                  <Badge variant="outline">{b.phase}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(parseISO(b.startDate), "MMM d")} -{" "}
                  {format(parseISO(b.endDate), "MMM d")}
                </div>
                {b.focus ? (
                  <div className="mt-1 text-xs text-muted-foreground">{b.focus}</div>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </aside>

      <WorkoutDrawer
        workout={selectedWorkout}
        onClose={() => setSelectedWorkout(null)}
      />
      <ChatDrawer open={chatOpen} onOpenChange={setChatOpen} planId={plan.id} />
      <ProgressDialog open={progressOpen} onOpenChange={setProgressOpen} progress={progress} />
    </div>
  );
}

function WeekCard({
  week,
  onSelect,
  blocks,
}: {
  week: { weekStart: string; days: (WorkoutRow | null)[] };
  onSelect: (w: WorkoutRow) => void;
  blocks: PlanData["blocks"];
}) {
  const start = parseISO(week.weekStart);
  const end = endOfWeek(start, { weekStartsOn: 1 });
  const phase = blocks.find(
    (b) => parseISO(b.startDate) <= end && parseISO(b.endDate) >= start
  )?.phase;

  const totalSec = week.days.reduce((a, d) => a + (d?.durationSeconds ?? 0), 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">
          Week of {format(start, "MMM d")} -{" "}
          <span className="text-muted-foreground">{formatDuration(totalSec)}</span>
        </CardTitle>
        {phase ? <Badge variant="secondary">{phase}</Badge> : null}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-7">
          {week.days.map((d, i) => (
            <DayCell key={i} date={addDays(start, i)} workout={d} onSelect={onSelect} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DayCell({
  date,
  workout,
  onSelect,
}: {
  date: Date;
  workout: WorkoutRow | null;
  onSelect: (w: WorkoutRow) => void;
}) {
  return (
    <button
      onClick={() => (workout ? onSelect(workout) : null)}
      disabled={!workout}
      className={
        "group flex min-h-[90px] flex-col rounded-md border p-2 text-left transition " +
        (workout
          ? "hover:border-primary hover:bg-accent/40"
          : "cursor-default bg-muted/30")
      }
    >
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {format(date, "EEE d")}
      </div>
      {workout ? (
        <div className="mt-1 flex flex-1 flex-col">
          <div className="flex items-center gap-1 text-xs font-medium">
            <SportIcon sport={workout.sport} />
            <span className="truncate">{workout.title}</span>
          </div>
          <div className="mt-auto flex items-center gap-2 pt-1 text-[11px] text-muted-foreground">
            <span>{formatDuration(workout.durationSeconds)}</span>
            {workout.completed ? (
              <span className="inline-flex rounded bg-green-500/15 px-1.5 text-[10px] font-medium text-green-700 dark:text-green-400">
                done
              </span>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="mt-2 text-xs text-muted-foreground">—</div>
      )}
    </button>
  );
}

function SportIcon({ sport }: { sport: string }) {
  const cls = "h-3.5 w-3.5";
  switch (sport) {
    case "RUN":
    case "ULTRA":
      return <Run className={cls} />;
    case "BIKE":
      return <Bike className={cls} />;
    case "SWIM":
      return <Waves className={cls} />;
    case "STRENGTH":
      return <Dumbbell className={cls} />;
    default:
      return <PersonStanding className={cls} />;
  }
}

function groupByWeek(workouts: WorkoutRow[]) {
  const map = new Map<string, (WorkoutRow | null)[]>();
  workouts.forEach((w) => {
    const d = parseISO(w.date);
    const ws = startOfWeek(d, { weekStartsOn: 1 });
    const key = format(ws, "yyyy-MM-dd");
    if (!map.has(key)) map.set(key, Array.from({ length: 7 }, () => null));
    const idx = Math.max(0, Math.min(6, differenceInCalendarDays(d, ws)));
    map.get(key)![idx] = w;
  });
  return Array.from(map.entries())
    .map(([weekStart, days]) => ({ weekStart, days }))
    .sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1));
}

function formatStage(p: { stage: string; [k: string]: unknown }) {
  switch (p.stage) {
    case "start":
      return "Starting pipeline...";
    case "architect:done":
      return "Periodization outline built";
    case "generator:done":
      return `Generated ${p.workoutCount} workouts`;
    case "reviewer:done":
      return `Science review found ${p.issues} issue(s)`;
    case "revisor:done":
      return "Plan revised";
    case "saved":
      return "Plan saved";
    default:
      return p.stage;
  }
}

function ProgressDialog({
  open,
  onOpenChange,
  progress,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  progress: string[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generating your plan</DialogTitle>
        </DialogHeader>
        <ol className="space-y-1 text-sm">
          {progress.length === 0 ? (
            <li className="text-muted-foreground">Warming up the coach...</li>
          ) : (
            progress.map((p, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{p}</span>
              </li>
            ))
          )}
        </ol>
      </DialogContent>
    </Dialog>
  );
}
