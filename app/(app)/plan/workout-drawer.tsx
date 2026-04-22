"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { formatDuration } from "@/lib/utils";
import { updateWorkout, saveFeedback } from "./actions";
import type { WorkoutRow } from "./plan-client";

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

export function WorkoutDrawer({
  workout,
  onClose,
}: {
  workout: WorkoutRow | null;
  onClose: () => void;
}) {
  const [title, setTitle] = React.useState(workout?.title ?? "");
  const [description, setDescription] = React.useState(workout?.description ?? "");
  const [duration, setDuration] = React.useState(workout?.durationSeconds ?? 0);
  const [fb, setFb] = React.useState(workout?.feedback ?? null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setTitle(workout?.title ?? "");
    setDescription(workout?.description ?? "");
    setDuration(workout?.durationSeconds ?? 0);
    setFb(workout?.feedback ?? null);
  }, [workout?.id]);

  if (!workout) return null;
  const steps = (workout.steps as Step[] | null) ?? [];

  async function saveEdits() {
    setSaving(true);
    try {
      await updateWorkout(workout!.id, { title, description, durationSeconds: duration });
      toast.success("Saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function submitFeedback(data: typeof fb & { completed: boolean }) {
    try {
      await saveFeedback(workout!.id, data);
      toast.success("Feedback saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <Dialog open={!!workout} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {format(parseISO(workout.date), "EEE, MMM d")} · {workout.title}
          </DialogTitle>
          <div className="flex flex-wrap gap-2 pt-1 text-sm text-muted-foreground">
            <Badge variant="outline">{workout.sport}</Badge>
            <Badge variant="secondary">{workout.type}</Badge>
            <span>{formatDuration(workout.durationSeconds)}</span>
            {workout.estimatedTss ? <span>· ~{workout.estimatedTss} TSS</span> : null}
          </div>
        </DialogHeader>

        <Tabs defaultValue="structure">
          <TabsList>
            <TabsTrigger value="structure">Structure</TabsTrigger>
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>

          <TabsContent value="structure">
            <div className="space-y-2">
              {workout.description ? (
                <p className="text-sm text-muted-foreground">{workout.description}</p>
              ) : null}
              <ol className="space-y-1 text-sm">
                {steps.length === 0 ? (
                  <li className="text-muted-foreground">Rest / unstructured.</li>
                ) : (
                  steps.map((s, i) => <StepLine key={i} step={s} depth={0} />)
                )}
              </ol>
            </div>
          </TabsContent>

          <TabsContent value="edit" className="space-y-3">
            <div>
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                rows={4}
                value={description ?? ""}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                value={Math.round(duration / 60)}
                onChange={(e) => setDuration(Number(e.target.value) * 60)}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={saveEdits} disabled={saving}>
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="feedback">
            <FeedbackForm
              initial={fb}
              onSave={async (data) => {
                await submitFeedback(data);
                setFb(data);
              }}
            />
          </TabsContent>

          <TabsContent value="export" className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Download this workout as a structured file you can upload to TrainingPeaks or your
              trainer app.
            </p>
            <div className="flex flex-wrap gap-2">
              <ExportButton workoutId={workout.id} format="zwo" label=".zwo (Zwift / TP)" />
              <ExportButton workoutId={workout.id} format="erg" label=".erg" />
              <ExportButton workoutId={workout.id} format="mrc" label=".mrc" />
              <ExportButton workoutId={workout.id} format="fit" label=".fit" />
              <ExportButton workoutId={workout.id} format="ics" label=".ics (calendar)" />
              <ExportButton workoutId={workout.id} format="pdf" label=".pdf" />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function StepLine({ step, depth }: { step: Step; depth: number }) {
  return (
    <li style={{ paddingLeft: depth * 12 }}>
      <div className="flex items-center gap-2">
        <span className="inline-flex min-w-[60px] justify-center rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
          {step.kind}
        </span>
        <span className="font-medium">{step.label}</span>
        {step.repeat ? (
          <span className="text-xs text-muted-foreground">× {step.repeat}</span>
        ) : null}
      </div>
      <div className="pl-[72px] text-xs text-muted-foreground">
        {step.durationSeconds ? formatDuration(step.durationSeconds) : null}
        {step.distanceMeters
          ? ` · ${(step.distanceMeters / 1000).toFixed(2)} km`
          : null}
        {step.target ? ` · ${formatTarget(step.target)}` : null}
        {step.cadenceRpm ? ` · ${step.cadenceRpm} rpm` : null}
      </div>
      {step.children?.length ? (
        <ol className="mt-1 space-y-1">
          {step.children.map((c, i) => (
            <StepLine key={i} step={c} depth={depth + 1} />
          ))}
        </ol>
      ) : null}
    </li>
  );
}

function formatTarget(t: Step["target"]) {
  if (!t) return "";
  const range =
    t.low !== undefined && t.high !== undefined
      ? `${t.low}-${t.high}`
      : t.value !== undefined
        ? `${t.value}`
        : "";
  switch (t.type) {
    case "percent_ftp":
      return `${range}% FTP`;
    case "watts":
      return `${range} W`;
    case "percent_lthr":
      return `${range}% LTHR`;
    case "bpm":
      return `${range} bpm`;
    case "hr_zone":
      return `Z${range}`;
    case "pace_per_km":
      return `${range}/km`;
    case "pace_per_mile":
      return `${range}/mi`;
    case "rpe":
      return `RPE ${range}`;
    default:
      return t.note ?? "";
  }
}

function FeedbackForm({
  initial,
  onSave,
}: {
  initial: WorkoutRow["feedback"];
  onSave: (d: NonNullable<WorkoutRow["feedback"]>) => void | Promise<void>;
}) {
  const [completed, setCompleted] = React.useState(initial?.completed ?? true);
  const [rpe, setRpe] = React.useState<number | "">(initial?.rpe ?? "");
  const [actualMin, setActualMin] = React.useState<number | "">(
    initial?.actualDurationSec ? Math.round(initial.actualDurationSec / 60) : ""
  );
  const [soreness, setSoreness] = React.useState<number | "">(initial?.sorenessLevel ?? "");
  const [sleep, setSleep] = React.useState<number | "">(initial?.sleepHours ?? "");
  const [stress, setStress] = React.useState<number | "">(initial?.stress ?? "");
  const [notes, setNotes] = React.useState(initial?.notes ?? "");

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          completed,
          rpe: rpe === "" ? null : Number(rpe),
          actualDurationSec: actualMin === "" ? null : Number(actualMin) * 60,
          sorenessLevel: soreness === "" ? null : Number(soreness),
          sleepHours: sleep === "" ? null : Number(sleep),
          stress: stress === "" ? null : Number(stress),
          notes,
        });
      }}
    >
      <div className="flex items-center gap-3">
        <Label>Completed as prescribed?</Label>
        <div className="flex gap-2">
          <Button
            size="sm"
            type="button"
            variant={completed ? "default" : "outline"}
            onClick={() => setCompleted(true)}
          >
            Yes
          </Button>
          <Button
            size="sm"
            type="button"
            variant={!completed ? "default" : "outline"}
            onClick={() => setCompleted(false)}
          >
            Skipped / modified
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Field label="RPE (1-10)" value={rpe} setValue={setRpe} type="number" />
        <Field
          label="Actual duration (min)"
          value={actualMin}
          setValue={setActualMin}
          type="number"
        />
        <Field label="Soreness (1-10)" value={soreness} setValue={setSoreness} type="number" />
        <Field label="Sleep (hours)" value={sleep} setValue={setSleep} type="number" />
        <Field label="Stress (1-10)" value={stress} setValue={setStress} type="number" />
      </div>

      <div>
        <Label>Notes</Label>
        <Textarea rows={3} value={notes ?? ""} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div className="flex justify-end">
        <Button type="submit">Save feedback</Button>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  setValue,
  type = "text",
}: {
  label: string;
  value: number | string;
  setValue: (v: number | "") => void;
  type?: string;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => setValue(e.target.value === "" ? "" : Number(e.target.value))}
      />
    </div>
  );
}

function ExportButton({
  workoutId,
  format,
  label,
}: {
  workoutId: string;
  format: string;
  label: string;
}) {
  return (
    <Button asChild variant="outline" size="sm">
      <a href={`/api/export/${format}?workoutIds=${workoutId}`} download>
        <Download className="mr-2 h-4 w-4" /> {label}
      </a>
    </Button>
  );
}
