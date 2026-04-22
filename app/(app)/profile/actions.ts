"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { profileSchema } from "@/lib/validation/profile";
import { revalidatePath } from "next/cache";

export async function saveProfile(input: unknown) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not signed in");

  const data = profileSchema.parse(input);
  const userId = session.user.id;

  await prisma.athleteProfile.upsert({
    where: { userId },
    update: {
      ...data,
      offDays: data.offDays ?? [],
      weeklyHoursPattern: data.weeklyHoursPattern ?? undefined,
      sportSplit: data.sportSplit ?? undefined,
    },
    create: {
      userId,
      ...data,
      offDays: data.offDays ?? [],
      weeklyHoursPattern: data.weeklyHoursPattern ?? undefined,
      sportSplit: data.sportSplit ?? undefined,
    },
  });

  revalidatePath("/profile");
  revalidatePath("/(app)", "layout");
  return { ok: true };
}
