import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  await prisma.stravaAccount.delete({ where: { userId: session.user.id } });
  return Response.json({ ok: true });
}
