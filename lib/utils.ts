import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export function formatDistanceMeters(meters: number, unit: "mi" | "km" = "mi"): string {
  if (!Number.isFinite(meters) || meters <= 0) return "0";
  if (unit === "km") return `${(meters / 1000).toFixed(1)} km`;
  return `${(meters / 1609.344).toFixed(1)} mi`;
}

export function pacePerMile(secondsPerMeter: number): string {
  if (!secondsPerMeter) return "--";
  const spm = secondsPerMeter * 1609.344;
  const min = Math.floor(spm / 60);
  const sec = Math.round(spm % 60)
    .toString()
    .padStart(2, "0");
  return `${min}:${sec}/mi`;
}
