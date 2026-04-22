"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import { FileDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Row = { id: string; date: string; title: string; sport: string; type: string };

const FORMATS = [
  { value: "zwo", label: ".zwo (Zwift / TP)" },
  { value: "erg", label: ".erg" },
  { value: "mrc", label: ".mrc" },
  { value: "fit", label: ".fit" },
  { value: "pdf", label: ".pdf" },
  { value: "ics", label: ".ics" },
];

export function ExportCenter({ planId, workouts }: { planId: string; workouts: Row[] }) {
  const [from, setFrom] = React.useState<string>("");
  const [to, setTo] = React.useState<string>("");
  const [sport, setSport] = React.useState<string>("all");
  const [format, setFormat] = React.useState("zwo");
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});

  const filtered = workouts.filter((w) => {
    if (from && w.date < from) return false;
    if (to && w.date > `${to}T23:59:59`) return false;
    if (sport !== "all" && w.sport !== sport) return false;
    return true;
  });

  const count = filtered.filter((w) => selected[w.id]).length;
  const allSelected = filtered.length > 0 && filtered.every((w) => selected[w.id]);

  function toggleAll() {
    const next: Record<string, boolean> = {};
    if (!allSelected) for (const w of filtered) next[w.id] = true;
    setSelected(next);
  }

  function exportHref(): string {
    const params = new URLSearchParams();
    const ids = Object.keys(selected).filter((k) => selected[k]);
    if (ids.length) params.set("workoutIds", ids.join(","));
    else params.set("planId", planId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return `/api/export/${format}?${params.toString()}`;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom export</CardTitle>
        <CardDescription>
          Filter by date and sport, optionally pick specific workouts, and choose a format.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1">
            <Label>From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Sport</Label>
            <Select value={sport} onValueChange={setSport}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="RUN">Running</SelectItem>
                <SelectItem value="BIKE">Cycling</SelectItem>
                <SelectItem value="SWIM">Swimming</SelectItem>
                <SelectItem value="STRENGTH">Strength</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Format</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FORMATS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {filtered.length} workouts · {count} selected
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={toggleAll}>
              {allSelected ? "Clear selection" : "Select all"}
            </Button>
            <Button asChild>
              <a href={exportHref()} download>
                <FileDown className="mr-2 h-4 w-4" /> Export {FORMATS.find((f) => f.value === format)?.label}
              </a>
            </Button>
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/60 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="w-10 px-3 py-2"></th>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Title</th>
                <th className="px-3 py-2 text-left">Sport</th>
                <th className="px-3 py-2 text-left">Type</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((w) => (
                <tr key={w.id} className="border-t">
                  <td className="px-3 py-1.5">
                    <Checkbox
                      checked={!!selected[w.id]}
                      onCheckedChange={(v) =>
                        setSelected((curr) => ({ ...curr, [w.id]: !!v }))
                      }
                    />
                  </td>
                  <td className="px-3 py-1.5">{format_date(w.date)}</td>
                  <td className="px-3 py-1.5 font-medium">{w.title}</td>
                  <td className="px-3 py-1.5">{w.sport}</td>
                  <td className="px-3 py-1.5">{w.type}</td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                    No workouts match your filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function format_date(iso: string) {
  return format(parseISO(iso), "EEE MMM d");
}
