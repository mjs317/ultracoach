// MVP mode: no auth gating, but we do mint a cookie-backed guest identity
// so every visitor has a stable id. Cookie minting has to happen here in
// middleware because Next.js 15 forbids `cookies().set()` inside Server
// Components during render, which is where our root layout runs.
import { NextResponse, type NextRequest } from "next/server";

const COOKIE = "ultracoach_uid";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export default function middleware(request: NextRequest) {
  if (request.cookies.get(COOKIE)?.value) {
    return NextResponse.next();
  }

  const id = crypto.randomUUID();

  // Expose the new cookie to the current render pass so downstream
  // Server Components can read it via `cookies().get()`.
  request.cookies.set(COOKIE, id);

  const response = NextResponse.next({ request });
  response.cookies.set({
    name: COOKIE,
    value: id,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
