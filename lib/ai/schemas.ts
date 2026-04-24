import { z } from "zod";

export const SportSchema = z.enum([
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

export const WorkoutTypeSchema = z.enum([
  "ENDURANCE",
  "TEMPO",
  "THRESHOLD",
  "VO2",
  "SPEED",
  "RECOVERY",
  "LONG",
  "BRICK",
  "RACE",
  "STRENGTH",
  "MOBILITY",
  "REST",
]);

export const TrainingPhaseSchema = z.enum([
  "BASE",
  "BUILD",
  "PEAK",
  "TAPER",
  "RECOVERY",
  "RACE_WEEK",
]);

export const TargetSchema = z.object({
  type: z
    .enum([
      "percent_ftp",
      "watts",
      "percent_lthr",
      "bpm",
      "hr_zone",
      "pace_per_km",
      "pace_per_mile",
      "rpe",
      "open",
    ])
    .describe("How the intensity is prescribed."),
  low: z.number().optional().describe("Low bound of the range."),
  high: z.number().optional().describe("High bound of the range."),
  value: z.number().optional().describe("Exact single value if not a range."),
  note: z.string().optional(),
});

export type WorkoutStep = {
  kind: "warmup" | "main" | "interval" | "recovery" | "cooldown" | "repeat";
  label: string;
  durationSeconds?: number;
  distanceMeters?: number;
  target?: z.infer<typeof TargetSchema>;
  cadenceRpm?: number;
  repeat?: number;
  children?: WorkoutStep[];
};

export const StepSchema: z.ZodType<WorkoutStep> = z.lazy(() =>
  z.object({
    kind: z.enum(["warmup", "main", "interval", "recovery", "cooldown", "repeat"]),
    label: z.string(),
    durationSeconds: z.number().int().nonnegative().optional(),
    distanceMeters: z.number().int().nonnegative().optional(),
    target: TargetSchema.optional(),
    cadenceRpm: z.number().int().optional(),
    repeat: z.number().int().optional(),
    children: z.array(StepSchema).optional(),
  })
);

export const WorkoutSchema = z.object({
  date: z.string().describe("ISO date (yyyy-mm-dd)"),
  sport: SportSchema,
  type: WorkoutTypeSchema,
  title: z.string(),
  description: z.string().nullable().optional(),
  durationSeconds: z.number().int().nonnegative(),
  distanceMeters: z.number().int().nonnegative().nullable().optional(),
  estimatedTss: z.number().int().nullable().optional(),
  steps: z.array(StepSchema),
});

export type GeneratedWorkout = z.infer<typeof WorkoutSchema>;

export const BlockSchema = z.object({
  name: z.string(),
  phase: TrainingPhaseSchema,
  startDate: z.string(),
  endDate: z.string(),
  focus: z.string().nullable().optional(),
});

export const ArchitectOutputSchema = z.object({
  planName: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  rationale: z.string(),
  blocks: z.array(BlockSchema).min(1),
  weeklyGuidance: z
    .array(
      z.object({
        weekStart: z.string(),
        totalHours: z.number().nonnegative(),
        intensityMix: z.object({
          easy: z.number().min(0).max(1),
          moderate: z.number().min(0).max(1),
          hard: z.number().min(0).max(1),
        }),
        notes: z.string(),
      })
    )
    .min(1),
});

export const GeneratorOutputSchema = z.object({
  workouts: z.array(WorkoutSchema).min(1),
});

export const IssueSchema = z.object({
  severity: z.enum(["info", "warning", "critical"]),
  topic: z.string(),
  description: z.string(),
  affectedDates: z.array(z.string()).default([]),
  suggestedFix: z.string(),
  citationIndexes: z.array(z.number().int()).default([]),
});

export const ReviewerOutputSchema = z.object({
  summary: z.string(),
  issues: z.array(IssueSchema).default([]),
  citations: z
    .array(
      z.object({
        url: z.string(),
        title: z.string(),
        snippet: z.string().nullable().optional(),
        topic: z.string().nullable().optional(),
      })
    )
    .default([]),
});

export const RevisorOutputSchema = z.object({
  revisionSummary: z.string(),
  workouts: z.array(WorkoutSchema),
});
