import type { AthleteProfile, Event as DbEvent } from "@prisma/client";

export function buildAthleteContext(profile: AthleteProfile): string {
  const hours = profile.weeklyHoursPattern as Record<string, number> | null;
  const split = profile.sportSplit as Record<string, number> | null;
  const off = (profile.offDays as string[] | null) ?? [];
  const weeklyTotal = hours ? Object.values(hours).reduce((a, b) => a + Number(b || 0), 0) : null;

  return `Athlete profile:
- Experience: ${profile.experienceLevel ?? "unspecified"}
- Weight: ${profile.weightKg ?? "unspecified"} kg
- Height: ${profile.heightCm ?? "unspecified"} cm
- FTP: ${profile.ftpWatts ?? "unknown"} W
- LTHR: ${profile.lthrBpm ?? "unknown"} bpm
- Max HR: ${profile.maxHrBpm ?? "unknown"} bpm
- Resting HR: ${profile.restingHrBpm ?? "unknown"} bpm
- Threshold run pace: ${profile.thresholdRunPaceSecPerKm ? `${profile.thresholdRunPaceSecPerKm}s/km` : "unknown"}
- Swim CSS: ${profile.thresholdSwimCssSecPer100m ? `${profile.thresholdSwimCssSecPer100m}s/100m` : "unknown"}
- Weekly hours pattern (h/day): ${hours ? JSON.stringify(hours) : "unspecified"} (total ~${weeklyTotal?.toFixed(1) ?? "?"}h)
- Sport split: ${split ? JSON.stringify(split) : "unspecified"}
- Off days: ${off.length ? off.join(", ") : "none"}
- Equipment: power meter=${profile.hasPowerMeter}, smart trainer=${profile.hasSmartTrainer}, HR=${profile.hasHeartRate}, GPS=${profile.hasGps}, pool=${profile.poolAccess}
- Constraints: ${profile.constraints || "none specified"}`;
}

export function buildEventsContext(events: DbEvent[]): string {
  if (events.length === 0) return "No events scheduled.";
  const lines = events.map((e) => {
    const mi = e.distanceMeters ? `${(e.distanceMeters / 1609.344).toFixed(1)} mi` : null;
    const dur = e.durationSeconds
      ? `${Math.floor(e.durationSeconds / 3600)}h${Math.round((e.durationSeconds % 3600) / 60)
          .toString()
          .padStart(2, "0")}m`
      : null;
    return `- ${e.date.toISOString().slice(0, 10)} | ${e.sport} | ${e.name} | priority ${e.priority} | target ${mi ?? dur ?? "n/a"}${
      e.elevationGainM ? ` | +${e.elevationGainM}m` : ""
    }${e.terrain ? ` | ${e.terrain}` : ""}${e.notes ? ` | notes: ${e.notes}` : ""}`;
  });
  return `Events (sorted by date):\n${lines.join("\n")}`;
}
