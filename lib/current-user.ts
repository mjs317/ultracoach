import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";

/**
 * MVP user model: every browser gets a cookie-backed anonymous user.
 *
 * We keep the existing Prisma `User` table and just stamp the user a
 * placeholder email derived from the cookie. When auth is re-enabled
 * later, a real sign-up can claim this user by updating the email and
 * setting passwordHash.
 */

const COOKIE = "ultracoach_uid";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
};

export async function getCurrentUser(): Promise<CurrentUser> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(COOKIE)?.value;

  if (existing) {
    const user = await prisma.user.findUnique({
      where: { id: existing },
      select: { id: true, email: true, name: true },
    });
    if (user) return user;
  }

  // Either no cookie, or the user it pointed at was deleted. Make a fresh one.
  const id = randomUUID();
  const email = `guest+${id}@ultracoach.local`;
  const user = await prisma.user.create({
    data: { id, email },
    select: { id: true, email: true, name: true },
  });

  cookieStore.set(COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });

  return user;
}

/**
 * Read the current user without creating one. Returns null if no cookie.
 * Useful in route handlers where we don't want to mutate state.
 */
export async function tryGetCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(COOKIE)?.value;
  if (!existing) return null;
  return prisma.user.findUnique({
    where: { id: existing },
    select: { id: true, email: true, name: true },
  });
}
