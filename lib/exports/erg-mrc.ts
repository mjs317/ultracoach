import { flattenSteps, type ExportWorkout, type AthleteCtx } from "./types";

function ftpPct(target: ExportWorkout["steps"][number]["target"], ctx: AthleteCtx): [number, number] {
  if (!target) return [60, 65];
  if (target.type === "percent_ftp") {
    const low = target.low ?? target.value ?? 65;
    const high = target.high ?? target.value ?? low;
    return [low, high];
  }
  if (target.type === "watts" && ctx.ftpWatts) {
    const low = Math.round(((target.low ?? target.value ?? 0) / ctx.ftpWatts) * 100);
    const high = Math.round(((target.high ?? target.value ?? 0) / ctx.ftpWatts) * 100);
    return [low || 60, high || 65];
  }
  if (target.type === "rpe" && target.value !== undefined) {
    const pct = Math.min(150, Math.max(40, 40 + target.value * 10));
    return [pct, pct];
  }
  return [60, 65];
}

export function workoutToErg(w: ExportWorkout, ctx: AthleteCtx, mode: "erg" | "mrc"): string {
  const steps = flattenSteps(w.steps);
  const rows: string[] = [];
  let t = 0;
  if (steps.length === 0) {
    rows.push(`0.00\t60`);
    rows.push(`${(w.durationSeconds / 60).toFixed(2)}\t60`);
  } else {
    for (const s of steps) {
      const [lo, hi] = ftpPct(s.target, ctx);
      const durMin = Math.max(0.1, (s.durationSeconds ?? 60) / 60);
      const valStart =
        mode === "mrc" ? lo : Math.round(((lo * (ctx.ftpWatts ?? 250)) / 100) * 10) / 10;
      const valEnd =
        mode === "mrc" ? hi : Math.round(((hi * (ctx.ftpWatts ?? 250)) / 100) * 10) / 10;
      rows.push(`${t.toFixed(2)}\t${valStart}`);
      t += durMin;
      rows.push(`${t.toFixed(2)}\t${valEnd}`);
    }
  }

  const header =
    mode === "mrc"
      ? `[COURSE HEADER]\nVERSION = 2\nUNITS = ENGLISH\nDESCRIPTION = ${w.title}\nFILE NAME = ${w.title}\nMINUTES PERCENT\n[END COURSE HEADER]\n[COURSE DATA]`
      : `[COURSE HEADER]\nVERSION = 2\nUNITS = ENGLISH\nDESCRIPTION = ${w.title}\nFILE NAME = ${w.title}\nFTP = ${ctx.ftpWatts ?? 250}\nMINUTES WATTS\n[END COURSE HEADER]\n[COURSE DATA]`;

  return `${header}\n${rows.join("\n")}\n[END COURSE DATA]\n`;
}
