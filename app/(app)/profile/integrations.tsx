"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function IntegrationsPanel({
  stravaConnected,
  activityCount,
}: {
  stravaConnected: boolean;
  activityCount: number;
}) {
  const [busy, setBusy] = React.useState(false);
  const [uploadBusy, setUploadBusy] = React.useState(false);

  async function sync() {
    setBusy(true);
    try {
      const res = await fetch("/api/strava/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ days: 60 }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data: { imported: number } = await res.json();
      toast.success(`Imported ${data.imported} activities`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    if (!confirm("Disconnect Strava?")) return;
    await fetch("/api/strava/disconnect", { method: "POST" });
    window.location.reload();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/activities/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Activity uploaded");
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadBusy(false);
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Strava</CardTitle>
          <CardDescription>
            Sync recent activities so the coach can adapt future workouts from what you actually did.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground">
            {stravaConnected
              ? `Connected · ${activityCount} activities imported.`
              : "Not connected yet."}
          </div>
          <div className="flex flex-wrap gap-2">
            {stravaConnected ? (
              <>
                <Button onClick={sync} disabled={busy}>
                  {busy ? "Syncing..." : "Sync last 60 days"}
                </Button>
                <Button variant="outline" onClick={disconnect}>Disconnect</Button>
              </>
            ) : (
              <Button asChild>
                <Link href="/api/strava/connect">Connect Strava</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload activity file</CardTitle>
          <CardDescription>
            Drop a .fit, .tcx, or .gpx file (e.g. from Garmin) to import it as an activity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <input
            type="file"
            accept=".fit,.tcx,.gpx"
            onChange={onFile}
            disabled={uploadBusy}
            className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-2 file:text-sm file:font-medium"
          />
        </CardContent>
      </Card>
    </div>
  );
}
