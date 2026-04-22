import { auth } from "@/auth";
import { stravaAuthorizeUrl } from "@/lib/strava";
import crypto from "crypto";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  if (!process.env.STRAVA_CLIENT_ID || !process.env.STRAVA_CLIENT_SECRET) {
    return new Response(
      "Strava is not configured. Set STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET.",
      { status: 500 }
    );
  }
  const state = crypto
    .createHash("sha256")
    .update(session.user.id + (process.env.AUTH_SECRET ?? "dev"))
    .digest("hex")
    .slice(0, 16);
  return Response.redirect(stravaAuthorizeUrl(state));
}
