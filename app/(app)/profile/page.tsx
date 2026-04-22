import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { ProfileForm } from "./profile-form";
import { IntegrationsPanel } from "./integrations";

export default async function ProfilePage() {
  const session = await auth();
  const userId = session!.user.id;

  const [profile, strava, activityCount] = await Promise.all([
    prisma.athleteProfile.findUnique({ where: { userId } }),
    prisma.stravaAccount.findUnique({ where: { userId } }),
    prisma.activity.count({ where: { userId } }),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Athlete profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        The coach uses this to scale volume, prescribe zones, and respect constraints. Fill in what
        you know; fields are optional.
      </p>
      <div className="mt-6">
        <ProfileForm initial={profile ?? null} />
      </div>
      <div className="mt-8">
        <h2 className="text-lg font-semibold">Integrations</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect Strava or upload workout files so the adaptive engine can factor in actuals.
        </p>
        <div className="mt-4">
          <IntegrationsPanel stravaConnected={!!strava} activityCount={activityCount} />
        </div>
      </div>
    </div>
  );
}
