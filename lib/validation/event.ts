import { z } from "zod";

export const SportEnum = z.enum([
  "RUN",
  "BIKE",
  "SWIM",
  "TRI",
  "DUATHLON",
  "ULTRA",
  "STRENGTH",
  "MOBILITY",
  "CUSTOM",
]);

export const PriorityEnum = z.enum(["A", "B", "C"]);

export const eventSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(200),
    date: z.string().min(1, "Date is required"),
    sport: SportEnum,
    priority: PriorityEnum.default("B"),
    distanceMeters: z.number().int().min(0).max(1_000_000).nullable().optional(),
    durationSeconds: z.number().int().min(0).max(60 * 60 * 240).nullable().optional(),
    elevationGainM: z.number().int().min(0).max(100_000).nullable().optional(),
    terrain: z.string().max(200).nullable().optional(),
    location: z.string().max(200).nullable().optional(),
    notes: z.string().max(4000).nullable().optional(),
  })
  .refine(
    (v) => (v.distanceMeters ?? 0) > 0 || (v.durationSeconds ?? 0) > 0,
    { message: "Enter either a distance or duration for this event.", path: ["distanceMeters"] }
  );

export type EventInput = z.infer<typeof eventSchema>;
