"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function restorePlan(planId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not signed in");
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan || plan.userId !== session.user.id) throw new Error("Not found");
  await prisma.$transaction(async (tx) => {
    await tx.plan.updateMany({
      where: { userId: session.user.id, status: "ACTIVE" },
      data: { status: "ARCHIVED" },
    });
    await tx.plan.update({ where: { id: planId }, data: { status: "ACTIVE" } });
  });
  revalidatePath("/plan");
  revalidatePath("/plan/history");
  return { ok: true };
}
