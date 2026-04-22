import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { EventsClient } from "./events-client";

export default async function EventsPage() {
  const session = await auth();
  const events = await prisma.event.findMany({
    where: { userId: session!.user.id },
    orderBy: { date: "asc" },
  });
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
          <p className="text-sm text-muted-foreground">
            Add every race or self-made challenge you&apos;re targeting. Set one A-priority per peak
            block; everything else is a B or C.
          </p>
        </div>
      </div>
      <EventsClient
        events={events.map((e) => ({
          ...e,
          date: e.date.toISOString(),
        }))}
      />
    </div>
  );
}
