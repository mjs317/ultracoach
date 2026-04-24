// MVP mode: no auth gating. The middleware is a no-op so the app is
// fully accessible without sign-in. Re-enable Auth.js middleware when
// login is restored.
import { NextResponse } from "next/server";

export default function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
