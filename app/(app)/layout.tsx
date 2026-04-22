import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Activity, Calendar, LayoutDashboard, LogOut, Settings, User, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const profile = await prisma.athleteProfile.findUnique({
    where: { userId: session.user.id },
  });

  const needsProfile = !profile;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
              <Activity className="h-5 w-5 text-primary" /> Ultracoach
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              <NavLink href="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />}>Dashboard</NavLink>
              <NavLink href="/events" icon={<Calendar className="h-4 w-4" />}>Events</NavLink>
              <NavLink href="/plan" icon={<Activity className="h-4 w-4" />}>Plan</NavLink>
              <NavLink href="/exports" icon={<FileDown className="h-4 w-4" />}>Exports</NavLink>
              <NavLink href="/profile" icon={<User className="h-4 w-4" />}>Profile</NavLink>
              <NavLink href="/settings" icon={<Settings className="h-4 w-4" />}>Settings</NavLink>
            </nav>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <Button variant="ghost" size="sm" type="submit">
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </Button>
          </form>
        </div>
      </header>

      {needsProfile ? (
        <div className="container py-3">
          <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
            Finish your <Link className="font-semibold underline" href="/profile">athlete profile</Link> to unlock plan generation.
          </div>
        </div>
      ) : null}

      <main className="container flex-1 py-6">{children}</main>
    </div>
  );
}

function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
    >
      {icon}
      {children}
    </Link>
  );
}
