"use client";

import * as React from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { saveSettings } from "./actions";

type AdaptMode = "MANUAL" | "FEEDBACK" | "ACTUALS";

export function SettingsForm({
  initial,
}: {
  initial: { adaptMode: AdaptMode; unitSystem: string; aiProvider: string | null };
}) {
  const [adaptMode, setAdaptMode] = React.useState<AdaptMode>(initial.adaptMode);
  const [unitSystem, setUnitSystem] = React.useState(initial.unitSystem);
  const [aiProvider, setAiProvider] = React.useState(initial.aiProvider ?? "auto");
  const [saving, setSaving] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await saveSettings({
        adaptMode,
        unitSystem,
        aiProvider: aiProvider === "auto" ? null : aiProvider,
      });
      toast.success("Settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Adaptive re-planning</CardTitle>
          <CardDescription>
            How should the coach revise future weeks?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label>Mode</Label>
          <Select value={adaptMode} onValueChange={(v) => setAdaptMode(v as AdaptMode)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="MANUAL">Manual - I regenerate when I want to</SelectItem>
              <SelectItem value="FEEDBACK">
                Feedback-based - use my completed / RPE / notes to auto-revise
              </SelectItem>
              <SelectItem value="ACTUALS">
                Actuals-based - use imported activities (Strava / .fit uploads, when configured)
              </SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Units</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={unitSystem} onValueChange={setUnitSystem}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="imperial">Imperial (miles, feet, °F)</SelectItem>
              <SelectItem value="metric">Metric (km, meters, °C)</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI provider</CardTitle>
          <CardDescription>
            Leave on Auto to use whichever is configured via environment. Override per account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={aiProvider} onValueChange={setAiProvider}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto (server default)</SelectItem>
              <SelectItem value="anthropic">Anthropic Claude</SelectItem>
              <SelectItem value="openai">OpenAI GPT</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save settings"}</Button>
      </div>
    </form>
  );
}
