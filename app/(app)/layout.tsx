import Link from "next/link";
import { Activity, Calendar, LayoutDashboard, User, FileDown } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const profile = await prisma.athleteProfile.findUnique({
    where: { userId: user.id },
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
              <NavLink href="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />}>
                Dashboard
              </NavLink>
              <NavLink href="/events" icon={<Calendar className="h-4 w-4" />}>
                Events
              </NavLink>
              <NavLink href="/plan" icon={<Activity className="h-4 w-4" />}>
                Plan
              </NavLink>
              <NavLink href="/exports" icon={<FileDown className="h-4 w-4" />}>
                Exports
              </NavLink>
              <NavLink href="/profile" icon={<User className="h-4 w-4" />}>
                Profile
              </NavLink>
            </nav>
          </div>
          <div className="text-xs text-muted-foreground">MVP preview</div>
        </div>
      </header>

      {needsProfile ? (
        <div className="container py-3">
          <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
            Tip: fill in your{" "}
            <Link className="font-semibold underline" href="/profile">
              athlete profile
            </Link>{" "}
            (FTP, LTHR, weekly hours) so the coach can refine the plan to your
            fitness. It&apos;s optional — you can generate a plan without it.
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
