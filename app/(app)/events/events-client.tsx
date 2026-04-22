"use client";

import * as React from "react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { createEvent, updateEvent, deleteEvent } from "./actions";
import type { Sport, EventPriority } from "@prisma/client";

type EventRow = {
  id: string;
  name: string;
  date: string;
  sport: Sport;
  priority: EventPriority;
  distanceMeters: number | null;
  durationSeconds: number | null;
  elevationGainM: number | null;
  terrain: string | null;
  location: string | null;
  notes: string | null;
};

const SPORTS: { value: Sport; label: string }[] = [
  { value: "RUN", label: "Running" },
  { value: "BIKE", label: "Cycling" },
  { value: "SWIM", label: "Swimming" },
  { value: "TRI", label: "Triathlon" },
  { value: "DUATHLON", label: "Duathlon" },
  { value: "ULTRA", label: "Ultra endurance" },
  { value: "CUSTOM", label: "Custom" },
];

export function EventsClient({ events }: { events: EventRow[] }) {
  const [editing, setEditing] = React.useState<EventRow | null>(null);
  const [open, setOpen] = React.useState(false);

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}>
              <Plus className="mr-2 h-4 w-4" /> Add event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit event" : "Add event"}</DialogTitle>
            </DialogHeader>
            <EventForm
              initial={editing}
              onSaved={() => {
                setOpen(false);
                setEditing(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {events.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          No events yet. Add your first race or self-made challenge.
        </div>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Sport</th>
                <th className="px-4 py-2 text-left">Distance / Duration</th>
                <th className="px-4 py-2 text-left">Priority</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className="border-t">
                  <td className="px-4 py-2 whitespace-nowrap">
                    {format(parseISO(e.date), "MMM d, yyyy")}
                  </td>
                  <td className="px-4 py-2 font-medium">{e.name}</td>
                  <td className="px-4 py-2">
                    {SPORTS.find((s) => s.value === e.sport)?.label ?? e.sport}
                  </td>
                  <td className="px-4 py-2">{renderTarget(e)}</td>
                  <td className="px-4 py-2">
                    <Badge variant={e.priority === "A" ? "default" : e.priority === "B" ? "secondary" : "outline"}>
                      {e.priority}
                    </Badge>
                  </td>
                  <td className="flex justify-end gap-1 px-4 py-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditing(e);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={async () => {
                        if (!confirm(`Delete "${e.name}"?`)) return;
                        try {
                          await deleteEvent(e.id);
                          toast.success("Event deleted");
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : "Failed");
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function renderTarget(e: EventRow) {
  if (e.distanceMeters) {
    const mi = (e.distanceMeters / 1609.344).toFixed(1);
    return `${mi} mi`;
  }
  if (e.durationSeconds) {
    const h = Math.floor(e.durationSeconds / 3600);
    const m = Math.round((e.durationSeconds % 3600) / 60);
    return `${h}h ${m}m`;
  }
  return "--";
}

function EventForm({
  initial,
  onSaved,
}: {
  initial: EventRow | null;
  onSaved: () => void;
}) {
  const [name, setName] = React.useState(initial?.name ?? "");
  const [date, setDate] = React.useState(
    initial ? initial.date.slice(0, 10) : ""
  );
  const [sport, setSport] = React.useState<Sport>(initial?.sport ?? "RUN");
  const [priority, setPriority] = React.useState<EventPriority>(
    initial?.priority ?? "B"
  );
  const [target, setTarget] = React.useState<"distance" | "duration">(
    initial?.durationSeconds ? "duration" : "distance"
  );
  const [distanceMiles, setDistanceMiles] = React.useState<number | "">(
    initial?.distanceMeters ? Number((initial.distanceMeters / 1609.344).toFixed(2)) : ""
  );
  const [hours, setHours] = React.useState<number | "">(
    initial?.durationSeconds ? Math.floor(initial.durationSeconds / 3600) : ""
  );
  const [mins, setMins] = React.useState<number | "">(
    initial?.durationSeconds ? Math.round((initial.durationSeconds % 3600) / 60) : ""
  );
  const [elev, setElev] = React.useState<number | "">(initial?.elevationGainM ?? "");
  const [terrain, setTerrain] = React.useState(initial?.terrain ?? "");
  const [location, setLocation] = React.useState(initial?.location ?? "");
  const [notes, setNotes] = React.useState(initial?.notes ?? "");
  const [saving, setSaving] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name,
        date,
        sport,
        priority,
        distanceMeters:
          target === "distance" && distanceMiles !== ""
            ? Math.round(Number(distanceMiles) * 1609.344)
            : null,
        durationSeconds:
          target === "duration"
            ? Number(hours || 0) * 3600 + Number(mins || 0) * 60
            : null,
        elevationGainM: elev === "" ? null : Number(elev),
        terrain: terrain || null,
        location: location || null,
        notes: notes || null,
      };
      if (initial) {
        await updateEvent(initial.id, payload);
        toast.success("Event updated");
      } else {
        await createEvent(payload);
        toast.success("Event added");
      }
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Sport</Label>
          <Select value={sport} onValueChange={(v) => setSport(v as Sport)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SPORTS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as EventPriority)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="A">A - Peak (goal race)</SelectItem>
              <SelectItem value="B">B - Important tune-up</SelectItem>
              <SelectItem value="C">C - Supporting / fun</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Target</Label>
        <Select value={target} onValueChange={(v) => setTarget(v as "distance" | "duration")}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="distance">Distance (miles)</SelectItem>
            <SelectItem value="duration">Duration (hours / minutes)</SelectItem>
          </SelectContent>
        </Select>
        {target === "distance" ? (
          <Input
            type="number"
            step="0.1"
            placeholder="e.g., 26.2 or 100"
            value={distanceMiles}
            onChange={(e) =>
              setDistanceMiles(e.target.value === "" ? "" : Number(e.target.value))
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder="Hours"
              value={hours}
              onChange={(e) => setHours(e.target.value === "" ? "" : Number(e.target.value))}
            />
            <Input
              type="number"
              placeholder="Minutes"
              value={mins}
              onChange={(e) => setMins(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-2">
          <Label>Elevation gain (m)</Label>
          <Input
            type="number"
            value={elev}
            onChange={(e) => setElev(e.target.value === "" ? "" : Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label>Terrain</Label>
          <Input
            placeholder="road / trail / mixed"
            value={terrain ?? ""}
            onChange={(e) => setTerrain(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Location</Label>
          <Input
            value={location ?? ""}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Optional"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          rows={3}
          value={notes ?? ""}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Course, fueling plan, goals..."
        />
      </div>

      <DialogFooter>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : initial ? "Save changes" : "Add event"}
        </Button>
      </DialogFooter>
    </form>
  );
}
