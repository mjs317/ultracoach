import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const session = await auth();
  const userId = session.user.id;

  const profile = await prisma.athleteProfile.findUnique({ where: { userId } });

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
    </div>
  );
}
