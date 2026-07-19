"use client";

import { useActionState, useState } from "react";
import { updateAutomationSettingsAction, type AutomationSettingsState } from "@/actions/automation-runs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AutomationSettingsConfig } from "@/lib/automation-settings";
import { BALANCED_OUTDOOR_AUTOMATION_CATEGORIES } from "@/lib/automation-category-presets";

const initialState: AutomationSettingsState = { ok: false };

export function AutomationSettingsForm({ settings }: { settings: AutomationSettingsConfig }) {
  const [categories, setCategories] = useState(settings.categories.join("\n"));
  const [state, formAction, pending] = useActionState(
    updateAutomationSettingsAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex items-center gap-3 rounded-lg border p-3 text-sm">
          <input name="enabled" type="checkbox" defaultChecked={settings.enabled} />
          <span>
            <span className="block font-medium">Enable scheduled automation</span>
            <span className="text-muted-foreground">Cron calls return skipped when this is off.</span>
          </span>
        </label>
        <label className="flex items-center gap-3 rounded-lg border p-3 text-sm">
          <input name="notifyOnRun" type="checkbox" defaultChecked={settings.notifyOnRun} />
          <span>
            <span className="block font-medium">Email after each run</span>
            <span className="text-muted-foreground">Uses the notification email and Resend.</span>
          </span>
        </label>
        <label className="flex items-center gap-3 rounded-lg border p-3 text-sm">
          <input
            name="monthlySummaryEnabled"
            type="checkbox"
            defaultChecked={settings.monthlySummaryEnabled}
          />
          <span>
            <span className="block font-medium">Enable monthly summary</span>
            <span className="text-muted-foreground">Allows the monthly cron summary email.</span>
          </span>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <Input id="country" name="country" defaultValue={settings.country} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notificationEmail">Notification email</Label>
          <Input
            id="notificationEmail"
            name="notificationEmail"
            type="email"
            placeholder="admin@example.com"
            defaultValue={settings.notificationEmail ?? ""}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor="categories">Categories and rotation groups</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setCategories(BALANCED_OUTDOOR_AUTOMATION_CATEGORIES.join("\n"))
            }
          >
            Load balanced outdoor preset
          </Button>
        </div>
        <Textarea
          id="categories"
          name="categories"
          rows={12}
          value={categories}
          onChange={(event) => setCategories(event.target.value)}
          placeholder={"[Home & Property]\nCleaning & Floor Care\nTools & DIY\n[Camping & Campsite]\nTents & Shelters\nCoolers & Ice Packs"}
        />
        <p className="text-xs text-muted-foreground">
          One category per line. Add bracketed headers such as [Camping &
          Campsite] to rotate across groups before advancing within each group.
          Flat lists still rotate normally. Max drafts remains controlled by
          AUTOMATION_MAX_DRAFTS_PER_RUN.
        </p>
      </div>

      {state.message ? (
        <p className={state.ok ? "text-sm text-emerald-600" : "text-sm text-destructive"}>
          {state.message}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save automation settings"}
      </Button>
    </form>
  );
}
