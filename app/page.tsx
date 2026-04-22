import Link from "next/link";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Activity, Bike, Calendar, FileDown, Sparkles } from "lucide-react";

export default async function LandingPage() {
  const session = await auth();
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-background via-background to-muted/40">
      <header className="container flex items-center justify-between py-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Activity className="h-5 w-5 text-primary" />
          <span>Ultracoach</span>
        </Link>
        <nav className="flex items-center gap-3">
          {session?.user ? (
            <Button asChild>
              <Link href="/dashboard">Open dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link href="/auth/signin">Sign in</Link>
              </Button>
              <Button asChild>
                <Link href="/auth/signin">Get started</Link>
              </Button>
            </>
          )}
        </nav>
      </header>

      <section className="container grid gap-10 py-16 md:grid-cols-2 md:items-center md:py-24">
        <div>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            An AI coach for every event on your calendar.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            Plan running, cycling, triathlon, and ultra-endurance events in a single season.
            Ultracoach scales training to your available hours and reviews every plan against current
            exercise science, then exports structured workouts you can drop straight into
            TrainingPeaks.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href={session?.user ? "/dashboard" : "/auth/signin"}>
                <Sparkles className="mr-2 h-4 w-4" /> Build my season
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="#how-it-works">How it works</Link>
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Feature icon={<Calendar className="h-5 w-5" />} title="Season planning" copy="Add as many events as you want. The coach periodizes base, build, peak, and taper around each one." />
          <Feature icon={<Bike className="h-5 w-5" />} title="Multi-sport" copy="Run, bike, swim, tri, and custom ultra events with your own distance or duration." />
          <Feature icon={<Sparkles className="h-5 w-5" />} title="Science-reviewed" copy="Every plan is reviewed with live web-search citations on intensity, load, recovery, and taper." />
          <Feature icon={<FileDown className="h-5 w-5" />} title="TrainingPeaks ready" copy="Export .zwo, .erg, .mrc, .fit, PDF, or an iCal feed and complete the workouts as specified." />
        </div>
      </section>
    </div>
  );
}

function Feature({ icon, title, copy }: { icon: React.ReactNode; title: string; copy: string }) {
  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="font-semibold">{title}</div>
      <p className="mt-1 text-sm text-muted-foreground">{copy}</p>
    </div>
  );
}
