import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Bike,
  Calendar,
  FileDown,
  Sparkles,
  User,
  FlagTriangleRight,
  BookOpenCheck,
  RefreshCw,
} from "lucide-react";

export default function LandingPage() {
  const cta = "/dashboard";

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-background via-background to-muted/40">
      <header className="container flex items-center justify-between py-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Activity className="h-5 w-5 text-primary" />
          <span>Ultracoach</span>
        </Link>
        <nav className="flex items-center gap-3">
          <Button asChild>
            <Link href="/dashboard">Open app</Link>
          </Button>
        </nav>
      </header>

      <section className="container grid gap-10 py-16 md:grid-cols-2 md:items-center md:py-24">
        <div>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            An AI coach for every event on your calendar.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            Plan running, cycling, triathlon, and ultra-endurance events in a single season.
            Ultracoach scales training to your available hours and reviews every plan against
            current exercise science, then exports structured workouts you can drop straight into
            TrainingPeaks.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href={cta}>
                <Sparkles className="mr-2 h-4 w-4" /> Build my season
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="#how-it-works">How it works</Link>
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Feature
            icon={<Calendar className="h-5 w-5" />}
            title="Season planning"
            copy="Add as many events as you want. The coach periodizes base, build, peak, and taper around each one."
          />
          <Feature
            icon={<Bike className="h-5 w-5" />}
            title="Multi-sport"
            copy="Run, bike, swim, tri, and custom ultra events with your own distance or duration."
          />
          <Feature
            icon={<Sparkles className="h-5 w-5" />}
            title="Science-reviewed"
            copy="Every plan is audited for intensity distribution, ramp rate, recovery weeks, and taper before it lands on your calendar."
          />
          <Feature
            icon={<FileDown className="h-5 w-5" />}
            title="TrainingPeaks ready"
            copy="Export .zwo, .erg, .mrc, .fit, PDF, or an iCal feed and complete the workouts as specified."
          />
        </div>
      </section>

      <section id="how-it-works" className="container scroll-mt-24 border-t py-16 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">How it works</h2>
          <p className="mt-4 text-muted-foreground">
            Four steps from an empty calendar to a fully structured, science-reviewed season plan.
          </p>
        </div>

        <ol className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Step
            n={1}
            icon={<User className="h-5 w-5" />}
            title="Tell us about yourself"
            copy="Set thresholds (FTP, LTHR, run/swim pace), weekly-hour pattern, equipment, and any constraints. Nothing is required, fill in what you know."
          />
          <Step
            n={2}
            icon={<FlagTriangleRight className="h-5 w-5" />}
            title="Add your events"
            copy="Drop every A/B/C race on the calendar — road, gravel, marathon, 70.3, 100-mile ultra, or a made-up goal event of any distance or duration."
          />
          <Step
            n={3}
            icon={<BookOpenCheck className="h-5 w-5" />}
            title="Generate a science-reviewed plan"
            copy="A four-agent AI pipeline (architect, workout generator, science reviewer, revisor) periodizes your season, audits the plan against established training principles, and revises before delivery."
          />
          <Step
            n={4}
            icon={<RefreshCw className="h-5 w-5" />}
            title="Train, log, adapt"
            copy="Export to TrainingPeaks, Garmin, Zwift, or PDF. Log RPE or sync Strava/uploaded .fit files and ask the coach to adapt upcoming weeks."
          />
        </ol>

        <div className="mt-12 flex justify-center">
          <Button asChild size="lg">
            <Link href={cta}>
              <Sparkles className="mr-2 h-4 w-4" /> Start your plan
            </Link>
          </Button>
        </div>
      </section>

      <footer className="container border-t py-8 text-sm text-muted-foreground">
        <div className="flex flex-col items-center justify-between gap-2 md:flex-row">
          <span>© {new Date().getFullYear()} Ultracoach</span>
          <span>Built for athletes training for more than one thing.</span>
        </div>
      </footer>
    </div>
  );
}

function Feature({
  icon,
  title,
  copy,
}: {
  icon: React.ReactNode;
  title: string;
  copy: string;
}) {
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

function Step({
  n,
  icon,
  title,
  copy,
}: {
  n: number;
  icon: React.ReactNode;
  title: string;
  copy: string;
}) {
  return (
    <li className="relative rounded-lg border bg-card p-6 shadow-sm">
      <div className="absolute -top-3 left-6 inline-flex h-6 items-center rounded-full bg-primary px-2 text-xs font-semibold text-primary-foreground">
        Step {n}
      </div>
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="font-semibold">{title}</div>
      <p className="mt-2 text-sm text-muted-foreground">{copy}</p>
    </li>
  );
}
