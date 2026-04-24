import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";

/**
 * MVP user model: every browser gets a cookie-backed anonymous user.
 *
 * The cookie itself is minted by `middleware.ts` (Next.js 15 does not
 * permit `cookies().set()` from a Server Component during render). Here
 * we just read whatever cookie the middleware provisioned and upsert a
 * matching `User` row in the database. When auth is re-enabled later,
 * a real sign-up can claim the user by updating the email and setting
 * passwordHash.
 */

const COOKIE = "ultracoach_uid";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
};

async function upsertGuest(id: string): Promise<CurrentUser> {
  return prisma.user.upsert({
    where: { id },
    update: {},
    create: { id, email: `guest+${id}@ultracoach.local` },
    select: { id: true, email: true, name: true },
  });
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(COOKIE)?.value;

  if (existing) {
    return upsertGuest(existing);
  }

  // Fallback: we're executing outside of the middleware-covered paths
  // (e.g. a Server Action triggered before any page render). Mint a
  // cookie inline - legal here because Server Actions/Route Handlers
  // can write cookies.
  const id = randomUUID();
  const user = await upsertGuest(id);
  try {
    cookieStore.set(COOKIE, id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    });
  } catch {
    // Calling context is a Server Component (illegal to mutate
    // cookies). Middleware will set the cookie on the next request.
  }
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
