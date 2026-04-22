import { z } from "zod";

export const weeklyHoursSchema = z.object({
  mon: z.number().min(0).max(12).default(0),
  tue: z.number().min(0).max(12).default(0),
  wed: z.number().min(0).max(12).default(0),
  thu: z.number().min(0).max(12).default(0),
  fri: z.number().min(0).max(12).default(0),
  sat: z.number().min(0).max(12).default(0),
  sun: z.number().min(0).max(12).default(0),
});

export type WeeklyHours = z.infer<typeof weeklyHoursSchema>;

export const sportSplitSchema = z
  .object({
    run: z.number().min(0).max(1).default(0),
    bike: z.number().min(0).max(1).default(0),
    swim: z.number().min(0).max(1).default(0),
    strength: z.number().min(0).max(1).default(0),
  })
  .refine(
    (v) => Math.abs(v.run + v.bike + v.swim + v.strength - 1) < 0.05,
    "Sport split must sum to approximately 1.0"
  );

export type SportSplit = z.infer<typeof sportSplitSchema>;

export const profileSchema = z.object({
  experienceLevel: z.enum(["beginner", "intermediate", "advanced", "elite"]).optional(),
  weightKg: z.number().min(20).max(250).nullable().optional(),
  heightCm: z.number().min(100).max(250).nullable().optional(),
  ftpWatts: z.number().int().min(50).max(600).nullable().optional(),
  lthrBpm: z.number().int().min(80).max(220).nullable().optional(),
  maxHrBpm: z.number().int().min(100).max(240).nullable().optional(),
  restingHrBpm: z.number().int().min(25).max(120).nullable().optional(),
  thresholdRunPaceSecPerKm: z.number().min(120).max(1200).nullable().optional(),
  thresholdSwimCssSecPer100m: z.number().min(45).max(360).nullable().optional(),
  weeklyHoursPattern: weeklyHoursSchema.optional(),
  sportSplit: sportSplitSchema.optional(),
  offDays: z.array(z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"])).optional(),
  constraints: z.string().max(4000).optional().nullable(),
  hasPowerMeter: z.boolean().optional(),
  hasSmartTrainer: z.boolean().optional(),
  hasHeartRate: z.boolean().optional(),
  hasGps: z.boolean().optional(),
  poolAccess: z.boolean().optional(),
});

export type ProfileInput = z.infer<typeof profileSchema>;
