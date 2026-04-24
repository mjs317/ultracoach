/**
 * MVP auth shim.
 *
 * The real Auth.js setup (email + password, magic link, JWT sessions)
 * is preserved at @/auth-real for when we re-enable login. For the MVP
 * we route everything through a cookie-based guest user so the existing
 * `auth()` callers don't have to change.
 */

import { getCurrentUser, tryGetCurrentUser, type CurrentUser } from "@/lib/current-user";

export const emailAuthEnabled = false;

type ShimSession = {
  user: { id: string; email: string; name?: string | null; image?: string | null };
  expires: string;
};

function toSession(user: CurrentUser): ShimSession {
  return {
    user: { id: user.id, email: user.email, name: user.name },
    expires: new Date(Date.now() + 60 * 60 * 24 * 365 * 1000).toISOString(),
  };
}

export async function auth(): Promise<ShimSession> {
  const user = await getCurrentUser();
  return toSession(user);
}

/**
 * Variant that does NOT mint a new guest user. Useful in routes (e.g.
 * the public iCal feed) where we only want to read an existing session.
 */
export async function tryAuth(): Promise<ShimSession | null> {
  const user = await tryGetCurrentUser();
  return user ? toSession(user) : null;
}

export async function signIn() {
  // No-op in MVP mode.
}

export async function signOut(args?: { redirectTo?: string }) {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  cookieStore.delete("ultracoach_uid");
  if (args?.redirectTo) {
    const { redirect } = await import("next/navigation");
    redirect(args.redirectTo);
  }
}

/**
 * Stub Auth.js handlers so the legacy /api/auth/[...nextauth] route still
 * compiles. Calls just 404 in MVP mode.
 */
export const handlers = {
  GET: async () =>
    new Response("Auth disabled in MVP mode", { status: 404 }),
  POST: async () =>
    new Response("Auth disabled in MVP mode", { status: 404 }),
};
