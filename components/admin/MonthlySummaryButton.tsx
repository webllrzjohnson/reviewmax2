"use client";

import { useActionState } from "react";
import {
  sendMonthlyAutomationSummaryAction,
  type AutomationSettingsState,
} from "@/actions/automation-runs";
import { Button } from "@/components/ui/button";

const initialState: AutomationSettingsState = { ok: false };

export function MonthlySummaryButton() {
  const [state, formAction, pending] = useActionState(
    sendMonthlyAutomationSummaryAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-2">
      <Button variant="outline" type="submit" disabled={pending}>
        {pending ? "Sending..." : "Send monthly summary now"}
      </Button>
      {state.message ? (
        <p className={state.ok ? "text-sm text-emerald-600" : "text-sm text-destructive"}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
