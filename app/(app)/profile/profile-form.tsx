"use client";

import * as React from "react";
import { toast } from "sonner";
import type { AthleteProfile } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveProfile } from "./actions";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
type Day = (typeof DAYS)[number];

type Hours = Record<Day, number>;

export function ProfileForm({ initial }: { initial: AthleteProfile | null }) {
  const initialHours: Hours =
    (initial?.weeklyHoursPattern as Hours | null) ?? {
      mon: 0.75,
      tue: 1,
      wed: 1,
      thu: 1,
      fri: 0.5,
      sat: 2,
      sun: 2,
    };
  const initialSplit = (initial?.sportSplit as {
    run: number;
    bike: number;
    swim: number;
    strength: number;
  } | null) ?? { run: 0.4, bike: 0.4, swim: 0.1, strength: 0.1 };
  const initialOff = (initial?.offDays as Day[] | null) ?? [];

  const [experienceLevel, setExp] = React.useState(initial?.experienceLevel ?? "intermediate");
  const [weightKg, setWeight] = React.useState(initial?.weightKg ?? null);
  const [heightCm, setHeight] = React.useState(initial?.heightCm ?? null);
  const [ftp, setFtp] = React.useState(initial?.ftpWatts ?? null);
  const [lthr, setLthr] = React.useState(initial?.lthrBpm ?? null);
  const [maxHr, setMaxHr] = React.useState(initial?.maxHrBpm ?? null);
  const [rhr, setRhr] = React.useState(initial?.restingHrBpm ?? null);
  const [runPace, setRunPace] = React.useState(initial?.thresholdRunPaceSecPerKm ?? null);
  const [swimCss, setSwimCss] = React.useState(initial?.thresholdSwimCssSecPer100m ?? null);
  const [hours, setHours] = React.useState<Hours>(initialHours);
  const [split, setSplit] = React.useState(initialSplit);
  const [offDays, setOffDays] = React.useState<Day[]>(initialOff);
  const [constraints, setConstraints] = React.useState(initial?.constraints ?? "");
  const [hasPowerMeter, setPM] = React.useState(initial?.hasPowerMeter ?? false);
  const [hasSmartTrainer, setST] = React.useState(initial?.hasSmartTrainer ?? false);
  const [hasHeartRate, setHR] = React.useState(initial?.hasHeartRate ?? true);
  const [hasGps, setGps] = React.useState(initial?.hasGps ?? true);
  const [poolAccess, setPool] = React.useState(initial?.poolAccess ?? false);
  const [loading, setLoading] = React.useState(false);

  const weeklyTotal = Object.values(hours).reduce((a, b) => a + Number(b || 0), 0);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await saveProfile({
        experienceLevel,
        weightKg,
        heightCm,
        ftpWatts: ftp,
        lthrBpm: lthr,
        maxHrBpm: maxHr,
        restingHrBpm: rhr,
        thresholdRunPaceSecPerKm: runPace,
        thresholdSwimCssSecPer100m: swimCss,
        weeklyHoursPattern: hours,
        sportSplit: split,
        offDays,
        constraints,
        hasPowerMeter,
        hasSmartTrainer,
        hasHeartRate,
        hasGps,
        poolAccess,
      });
      toast.success("Profile saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <Card>
        <CardHeader><CardTitle>Basics</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Experience level</Label>
            <Select value={experienceLevel ?? "intermediate"} onValueChange={(v) => setExp(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner (&lt;1y consistent)</SelectItem>
                <SelectItem value="intermediate">Intermediate (1-4y)</SelectItem>
                <SelectItem value="advanced">Advanced (4y+, structured)</SelectItem>
                <SelectItem value="elite">Elite / competitive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <NumField label="Weight (kg)" value={weightKg} setValue={setWeight} step={0.1} />
          <NumField label="Height (cm)" value={heightCm} setValue={setHeight} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Training thresholds</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <NumField label="FTP (watts)" value={ftp} setValue={setFtp} />
          <NumField label="LTHR (bpm)" value={lthr} setValue={setLthr} />
          <NumField label="Max HR (bpm)" value={maxHr} setValue={setMaxHr} />
          <NumField label="Resting HR (bpm)" value={rhr} setValue={setRhr} />
          <NumField
            label="Threshold run pace (sec / km)"
            value={runPace}
            setValue={setRunPace}
            step={1}
          />
          <NumField
            label="Swim CSS (sec / 100m)"
            value={swimCss}
            setValue={setSwimCss}
            step={1}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Weekly availability</CardTitle></CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Hours per day (default template). Weekly total:{" "}
            <span className="font-medium text-foreground">{weeklyTotal.toFixed(1)}h</span>
          </p>
          <div className="grid grid-cols-3 gap-3 md:grid-cols-7">
            {DAYS.map((d) => (
              <div key={d} className="space-y-1">
                <Label className="capitalize">{d}</Label>
                <Input
                  type="number"
                  step="0.25"
                  min={0}
                  max={12}
                  value={hours[d]}
                  onChange={(e) =>
                    setHours((h) => ({ ...h, [d]: Number(e.target.value) }))
                  }
                />
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Label>Off days</Label>
            <div className="mt-2 flex flex-wrap gap-4">
              {DAYS.map((d) => (
                <label key={d} className="inline-flex items-center gap-2 text-sm capitalize">
                  <Checkbox
                    checked={offDays.includes(d)}
                    onCheckedChange={(c) => {
                      setOffDays((curr) =>
                        c ? [...curr, d] : curr.filter((x) => x !== d)
                      );
                    }}
                  />
                  {d}
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Sport split</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          {(["run", "bike", "swim", "strength"] as const).map((s) => (
            <div className="space-y-2" key={s}>
              <Label className="capitalize">{s}</Label>
              <Input
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={split[s]}
                onChange={(e) =>
                  setSplit((v) => ({ ...v, [s]: Number(e.target.value) }))
                }
              />
            </div>
          ))}
          <p className="col-span-full text-xs text-muted-foreground">
            Values should sum to ~1.0. Current sum:{" "}
            {(split.run + split.bike + split.swim + split.strength).toFixed(2)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Equipment</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Toggle label="Power meter" value={hasPowerMeter} setValue={setPM} />
          <Toggle label="Smart trainer" value={hasSmartTrainer} setValue={setST} />
          <Toggle label="Heart rate monitor" value={hasHeartRate} setValue={setHR} />
          <Toggle label="GPS watch/head unit" value={hasGps} setValue={setGps} />
          <Toggle label="Pool access" value={poolAccess} setValue={setPool} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Constraints &amp; notes</CardTitle></CardHeader>
        <CardContent>
          <Textarea
            rows={5}
            value={constraints ?? ""}
            onChange={(e) => setConstraints(e.target.value)}
            placeholder="E.g., recovering from Achilles tendinopathy, no hard running on consecutive days, long rides only on Saturdays, travel week of Mar 10..."
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save profile"}
        </Button>
      </div>
    </form>
  );
}

function NumField({
  label,
  value,
  setValue,
  step = 1,
}: {
  label: string;
  value: number | null;
  setValue: (v: number | null) => void;
  step?: number;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type="number"
        step={step}
        value={value ?? ""}
        onChange={(e) => setValue(e.target.value === "" ? null : Number(e.target.value))}
      />
    </div>
  );
}

function Toggle({
  label,
  value,
  setValue,
}: {
  label: string;
  value: boolean;
  setValue: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <Label>{label}</Label>
      <Switch checked={value} onCheckedChange={setValue} />
    </div>
  );
}
