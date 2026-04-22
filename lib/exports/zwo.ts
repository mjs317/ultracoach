import { create } from "xmlbuilder2";
import { flattenSteps, type ExportWorkout } from "./types";

function ftpFraction(target: ExportWorkout["steps"][number]["target"]): {
  low: number;
  high: number;
} {
  if (!target) return { low: 0.55, high: 0.65 };
  if (target.type === "percent_ftp") {
    const low = (target.low ?? target.value ?? 65) / 100;
    const high = (target.high ?? target.value ?? low * 100) / 100;
    return { low, high };
  }
  if (target.type === "rpe" && target.value !== undefined) {
    const rpe = target.value;
    const frac = Math.min(1.5, Math.max(0.4, 0.4 + rpe * 0.1));
    return { low: frac, high: frac };
  }
  return { low: 0.6, high: 0.65 };
}

export function workoutToZwo(w: ExportWorkout): string {
  const doc = create({ version: "1.0", encoding: "UTF-8" }).ele("workout_file");
  doc.ele("author").txt("Ultracoach").up();
  doc.ele("name").txt(w.title).up();
  doc.ele("description").txt(w.description ?? "").up();
  doc.ele("sportType").txt(w.sport === "RUN" ? "run" : "bike").up();
  doc.ele("tags").up();
  const workout = doc.ele("workout");

  const steps = flattenSteps(w.steps);
  if (steps.length === 0) {
    const { low, high } = ftpFraction(undefined);
    workout
      .ele("SteadyState", {
        Duration: Math.max(60, w.durationSeconds),
        Power: ((low + high) / 2).toFixed(2),
      })
      .up();
  } else {
    for (const s of steps) {
      const dur = Math.max(1, s.durationSeconds ?? 60);
      const { low, high } = ftpFraction(s.target);
      if (Math.abs(low - high) < 0.01) {
        workout
          .ele("SteadyState", {
            Duration: dur,
            Power: low.toFixed(2),
          })
          .up();
      } else {
        workout
          .ele("Ramp", {
            Duration: dur,
            PowerLow: low.toFixed(2),
            PowerHigh: high.toFixed(2),
          })
          .up();
      }
    }
  }

  return doc.end({ prettyPrint: true });
}
