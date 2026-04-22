"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { eventSchema } from "@/lib/validation/event";
import { revalidatePath } from "next/cache";

export async function createEvent(input: unknown) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not signed in");
  const data = eventSchema.parse(input);
  await prisma.event.create({
    data: {
      userId: session.user.id,
      name: data.name,
      date: new Date(data.date),
      sport: data.sport,
      priority: data.priority,
      distanceMeters: data.distanceMeters ?? null,
      durationSeconds: data.durationSeconds ?? null,
      elevationGainM: data.elevationGainM ?? null,
      terrain: data.terrain ?? null,
      location: data.location ?? null,
      notes: data.notes ?? null,
    },
  });
  revalidatePath("/events");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateEvent(id: string, input: unknown) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not signed in");
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) throw new Error("Not found");
  const data = eventSchema.parse(input);
  await prisma.event.update({
    where: { id },
    data: {
      name: data.name,
      date: new Date(data.date),
      sport: data.sport,
      priority: data.priority,
      distanceMeters: data.distanceMeters ?? null,
      durationSeconds: data.durationSeconds ?? null,
      elevationGainM: data.elevationGainM ?? null,
      terrain: data.terrain ?? null,
      location: data.location ?? null,
      notes: data.notes ?? null,
    },
  });
  revalidatePath("/events");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteEvent(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not signed in");
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) throw new Error("Not found");
  await prisma.event.delete({ where: { id } });
  revalidatePath("/events");
  revalidatePath("/dashboard");
  return { ok: true };
}
