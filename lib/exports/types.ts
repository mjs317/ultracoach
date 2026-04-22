import type { Sport, WorkoutType } from "@prisma/client";
import type { WorkoutStep } from "@/lib/ai/schemas";

export type ExportWorkout = {
  id: string;
  title: string;
  description: string | null;
  date: Date;
  sport: Sport;
  type: WorkoutType;
  durationSeconds: number;
  distanceMeters: number | null;
  estimatedTss: number | null;
  steps: WorkoutStep[];
};

export type AthleteCtx = {
  ftpWatts: number | null;
  lthrBpm: number | null;
  maxHrBpm: number | null;
  thresholdRunPaceSecPerKm: number | null;
};

export function flattenSteps(steps: WorkoutStep[]): WorkoutStep[] {
  const out: WorkoutStep[] = [];
  const walk = (list: WorkoutStep[], repeat = 1) => {
    for (let r = 0; r < repeat; r++) {
      for (const s of list) {
        if (s.kind === "repeat" && s.children?.length) {
          walk(s.children, Math.max(1, s.repeat ?? 1));
        } else {
          out.push(s);
        }
      }
    }
  };
  walk(steps);
  return out;
}
