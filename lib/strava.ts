import { prisma } from "@/lib/db";
import type { Sport } from "@prisma/client";

const AUTH_URL = "https://www.strava.com/oauth/authorize";
const TOKEN_URL = "https://www.strava.com/api/v3/oauth/token";
const ACTIVITIES_URL = "https://www.strava.com/api/v3/athlete/activities";

export function stravaAuthorizeUrl(state: string) {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const redirectUri = `${process.env.APP_URL ?? "http://localhost:3000"}/api/strava/callback`;
  const params = new URLSearchParams({
    client_id: clientId ?? "",
    response_type: "code",
    redirect_uri: redirectUri,
    approval_prompt: "auto",
    scope: "read,activity:read_all",
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export async function exchangeStravaCode(code: string) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Strava token exchange failed: ${res.status}`);
  return (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    scope?: string;
    athlete: { id: number };
  };
}

export async function refreshStravaToken(userId: string) {
  const acct = await prisma.stravaAccount.findUnique({ where: { userId } });
  if (!acct) throw new Error("Strava not connected");
  if (acct.expiresAt.getTime() > Date.now() + 60_000) return acct.accessToken;
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: acct.refreshToken,
    }),
  });
  if (!res.ok) throw new Error(`Strava token refresh failed: ${res.status}`);
  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
  await prisma.stravaAccount.update({
    where: { userId },
    data: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(data.expires_at * 1000),
    },
  });
  return data.access_token;
}

type StravaActivity = {
  id: number;
  name: string;
  type: string;
  sport_type?: string;
  start_date: string;
  elapsed_time: number;
  moving_time: number;
  distance: number;
  total_elevation_gain: number;
  average_heartrate?: number;
  average_watts?: number;
};

const SPORT_MAP: Record<string, Sport> = {
  Run: "RUN",
  TrailRun: "RUN",
  VirtualRun: "RUN",
  Ride: "BIKE",
  VirtualRide: "BIKE",
  MountainBikeRide: "BIKE",
  GravelRide: "BIKE",
  Swim: "SWIM",
  WeightTraining: "STRENGTH",
  Workout: "STRENGTH",
  Yoga: "MOBILITY",
  Walk: "CUSTOM",
  Hike: "CUSTOM",
};

export async function syncStravaActivities(userId: string, sinceDays = 30) {
  const token = await refreshStravaToken(userId);
  const after = Math.floor((Date.now() - sinceDays * 86400 * 1000) / 1000);
  const res = await fetch(`${ACTIVITIES_URL}?after=${after}&per_page=100`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Strava fetch failed: ${res.status}`);
  const activities = (await res.json()) as StravaActivity[];

  let imported = 0;
  for (const a of activities) {
    const sport = SPORT_MAP[a.sport_type ?? a.type] ?? "CUSTOM";
    await prisma.activity.upsert({
      where: {
        userId_source_externalId: {
          userId,
          source: "STRAVA",
          externalId: String(a.id),
        },
      },
      update: {
        name: a.name,
        sport,
        startTime: new Date(a.start_date),
        durationSeconds: a.moving_time || a.elapsed_time,
        distanceMeters: Math.round(a.distance ?? 0),
        elevationGainM: Math.round(a.total_elevation_gain ?? 0),
        averageHr: a.average_heartrate ? Math.round(a.average_heartrate) : null,
        averagePower: a.average_watts ? Math.round(a.average_watts) : null,
      },
      create: {
        userId,
        source: "STRAVA",
        externalId: String(a.id),
        name: a.name,
        sport,
        startTime: new Date(a.start_date),
        durationSeconds: a.moving_time || a.elapsed_time,
        distanceMeters: Math.round(a.distance ?? 0),
        elevationGainM: Math.round(a.total_elevation_gain ?? 0),
        averageHr: a.average_heartrate ? Math.round(a.average_heartrate) : null,
        averagePower: a.average_watts ? Math.round(a.average_watts) : null,
      },
    });
    imported++;
  }

  await linkActivitiesToWorkouts(userId);
  return imported;
}

/**
 * Same-day, same-sport naive matcher that links imported Activities
 * to planned Workouts so the adapter can factor actuals in.
 */
export async function linkActivitiesToWorkouts(userId: string) {
  const unlinked = await prisma.activity.findMany({
    where: { userId, linkedWorkoutId: null },
  });
  for (const a of unlinked) {
    const day = new Date(a.startTime);
    const from = new Date(day);
    from.setHours(0, 0, 0, 0);
    const to = new Date(day);
    to.setHours(23, 59, 59, 999);
    const workout = await prisma.workout.findFirst({
      where: {
        plan: { userId },
        date: { gte: from, lte: to },
        sport: a.sport,
      },
      orderBy: { date: "asc" },
    });
    if (workout) {
      await prisma.activity.update({
        where: { id: a.id },
        data: { linkedWorkoutId: workout.id },
      });
      const hadFeedback = await prisma.workoutFeedback.findUnique({
        where: { workoutId: workout.id },
      });
      if (!hadFeedback) {
        await prisma.workoutFeedback.create({
          data: {
            workoutId: workout.id,
            completed: true,
            actualDurationSec: a.durationSeconds,
            notes: `Auto-imported from Strava activity "${a.name}".`,
          },
        });
        await prisma.workout.update({
          where: { id: workout.id },
          data: { completed: true },
        });
      }
    }
  }
}
