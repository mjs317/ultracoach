import { createEvents, type EventAttributes } from "ics";
import type { ExportWorkout } from "./types";
import { formatDuration } from "@/lib/utils";

export function workoutsToIcs(workouts: ExportWorkout[]): string {
  const events: EventAttributes[] = workouts
    .filter((w) => w.durationSeconds > 0)
    .map((w) => {
      const start = new Date(w.date);
      start.setHours(6, 0, 0, 0);
      const dur = w.durationSeconds;
      const h = Math.floor(dur / 3600);
      const m = Math.round((dur % 3600) / 60);
      const description = [
        `${w.type} — ${w.sport}`,
        w.description ?? "",
        `Duration: ${formatDuration(dur)}`,
        w.estimatedTss ? `Estimated TSS: ${w.estimatedTss}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      return {
        title: `[Ultracoach] ${w.title}`,
        description,
        start: [
          start.getFullYear(),
          start.getMonth() + 1,
          start.getDate(),
          start.getHours(),
          start.getMinutes(),
        ],
        duration: { hours: h, minutes: m },
        calName: "Ultracoach",
        uid: `ultracoach-${w.id}@ultracoach.app`,
        categories: [w.sport, w.type],
      };
    });

  const { error, value } = createEvents(events);
  if (error) throw error;
  return value ?? "";
}
