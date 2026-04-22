import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { exchangeStravaCode } from "@/lib/strava";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const err = url.searchParams.get("error");
  if (err) {
    return Response.redirect(new URL(`/profile?strava_error=${encodeURIComponent(err)}`, req.url));
  }
  if (!code) return new Response("Missing code", { status: 400 });

  const tokens = await exchangeStravaCode(code);
  await prisma.stravaAccount.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      athleteId: String(tokens.athlete.id),
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(tokens.expires_at * 1000),
      scope: tokens.scope ?? null,
    },
    update: {
      athleteId: String(tokens.athlete.id),
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(tokens.expires_at * 1000),
      scope: tokens.scope ?? null,
    },
  });

  return Response.redirect(new URL("/profile?strava=connected", req.url));
}
