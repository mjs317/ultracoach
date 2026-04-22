"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  adaptMode: z.enum(["MANUAL", "FEEDBACK", "ACTUALS"]),
  unitSystem: z.enum(["imperial", "metric"]),
  aiProvider: z.string().optional().nullable(),
});

export async function saveSettings(input: unknown) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not signed in");
  const data = schema.parse(input);
  await prisma.userSettings.upsert({
    where: { userId: session.user.id },
    update: {
      adaptMode: data.adaptMode,
      unitSystem: data.unitSystem,
      aiProvider: data.aiProvider ?? null,
    },
    create: {
      userId: session.user.id,
      adaptMode: data.adaptMode,
      unitSystem: data.unitSystem,
      aiProvider: data.aiProvider ?? null,
    },
  });
  revalidatePath("/settings");
  return { ok: true };
}
