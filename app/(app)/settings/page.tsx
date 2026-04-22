import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const session = await auth();
  const settings = await prisma.userSettings.findUnique({
    where: { userId: session!.user.id },
  });
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Control how aggressively the coach adapts your plan and pick a preferred AI provider.
      </p>
      <div className="mt-6">
        <SettingsForm
          initial={{
            adaptMode: settings?.adaptMode ?? "MANUAL",
            unitSystem: settings?.unitSystem ?? "imperial",
            aiProvider: settings?.aiProvider ?? null,
          }}
        />
      </div>
    </div>
  );
}
