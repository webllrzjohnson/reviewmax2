"use client";

import { useActionState } from "react";
import {
  resetAiGenerationSettingsAction,
  testAiGenerationSettingsAction,
  updateAiGenerationSettingsAction,
  type AiSettingsState,
} from "@/actions/ai-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AiGenerationSettingsConfig } from "@/lib/ai-settings";

const initialState: AiSettingsState = { ok: false };

export function AiGenerationSettingsForm({ settings }: { settings: AiGenerationSettingsConfig }) {
  const [saveState, saveAction, saving] = useActionState(
    updateAiGenerationSettingsAction,
    initialState,
  );
  const [testState, testAction, testing] = useActionState(
    testAiGenerationSettingsAction,
    initialState,
  );
  const [resetState, resetAction, resetting] = useActionState(
    resetAiGenerationSettingsAction,
    initialState,
  );

  return (
    <div className="space-y-4">
      <form action={saveAction} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="anthropicModel">Claude / Anthropic model</Label>
            <Input
              id="anthropicModel"
              name="anthropicModel"
              defaultValue={settings.anthropicModel}
              placeholder="claude-sonnet-4-6"
            />
            <p className="text-xs text-muted-foreground">
              Used when ANTHROPIC_API_KEY is configured.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="openaiModel">OpenAI fallback model</Label>
            <Input
              id="openaiModel"
              name="openaiModel"
              defaultValue={settings.openaiModel}
              placeholder="gpt-4o-mini"
            />
            <p className="text-xs text-muted-foreground">
              Used only if Claude is unavailable or fails.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reviewSystemPrompt">Review generation system prompt</Label>
          <Textarea
            id="reviewSystemPrompt"
            name="reviewSystemPrompt"
            rows={16}
            defaultValue={settings.reviewSystemPrompt}
          />
          <p className="text-xs text-muted-foreground">
            Keep the JSON schema instructions unless you also update the parser. The product name, category, Amazon URL, and editor notes are added separately at generation time.
          </p>
        </div>

        {saveState.message ? (
          <p className={saveState.ok ? "text-sm text-emerald-600" : "text-sm text-destructive"}>
            {saveState.message}
          </p>
        ) : null}

        {testState.message ? (
          <pre className={testState.ok ? "whitespace-pre-wrap rounded-lg border bg-muted/40 p-3 text-sm text-foreground" : "whitespace-pre-wrap rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"}>
            {testState.message}
          </pre>
        ) : null}

        {resetState.message ? (
          <p className={resetState.ok ? "text-sm text-emerald-600" : "text-sm text-destructive"}>
            {resetState.message}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={saving || testing || resetting}>
            {saving ? "Saving..." : "Save AI settings"}
          </Button>
          <Button
            type="submit"
            variant="outline"
            formAction={testAction}
            disabled={saving || testing || resetting}
          >
            {testing ? "Testing..." : "Test prompt"}
          </Button>
        </div>
      </form>

      <form action={resetAction}>
        <Button type="submit" variant="ghost" disabled={saving || testing || resetting}>
          {resetting ? "Resetting..." : "Reset to default prompt and models"}
        </Button>
      </form>
    </div>
  );
}
