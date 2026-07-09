"use client";

import { useState } from "react";
import {
  discoverAndEnqueueAction,
  type DiscoverActionState,
} from "@/actions/discover-products";
import { AUTOMATION_MAX_ITEMS_PER_RUN } from "@/lib/automation";
import { DISCOVERY_COUNTRIES } from "@/lib/countries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function DiscoverForm() {
  const [category, setCategory] = useState("");
  const [country, setCountry] = useState("United States");
  const [maxItems, setMaxItems] = useState(3);
  const [submitting, setSubmitting] = useState(false);
  const [state, setState] = useState<DiscoverActionState | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setState(null);
    try {
      const result = await discoverAndEnqueueAction({ category, country, maxItems });
      setState(result);
    } catch {
      setState({
        ok: false,
        message: "Could not reach the server. Try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Discover products</CardTitle>
          <CardDescription>
            Searches Amazon for a category (via SerpApi), skips products already
            reviewed, generates draft reviews, and records an automation run.
            Requires <code>SERPAPI_KEY</code> and an AI key.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="category">Category / search term</Label>
              <Input
                id="category"
                placeholder="e.g. cat food"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <select
                id="country"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              >
                {DISCOVERY_COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxItems">Max drafts this run</Label>
              <Input
                id="maxItems"
                type="number"
                min={1}
                max={AUTOMATION_MAX_ITEMS_PER_RUN}
                value={maxItems}
                onChange={(e) => setMaxItems(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Safe limit: {AUTOMATION_MAX_ITEMS_PER_RUN} drafts per run.
              </p>
            </div>

            <Button type="submit" disabled={submitting || !category.trim()}>
              {submitting ? "Discovering & generating…" : "Discover & generate"}
            </Button>
            {submitting ? (
              <p className="text-xs text-muted-foreground">
                This can take a minute or two while each review is generated.
              </p>
            ) : null}
          </form>
        </CardContent>
      </Card>

      {state ? (
        <Card
          className={
            state.ok
              ? "border-emerald-200 dark:border-emerald-900"
              : "border-destructive/40"
          }
        >
          <CardHeader>
            <CardTitle className="text-base">
              {state.ok ? "Done" : "Error"}
            </CardTitle>
            {state.message ? (
              <CardDescription>{state.message}</CardDescription>
            ) : null}
          </CardHeader>
          {state.results && state.results.length > 0 ? (
            <CardContent>
              <ul className="space-y-2 text-sm">
                {state.results.map((r, i) => (
                  <li
                    key={`${r.name}-${i}`}
                    className="flex items-start justify-between gap-3 border-b pb-2 last:border-0"
                  >
                    <span className="font-medium">{r.name}</span>
                    <span
                      className={
                        r.ok
                          ? "whitespace-nowrap text-emerald-600 dark:text-emerald-400"
                          : "whitespace-nowrap text-destructive"
                      }
                    >
                      {r.ok ? "Generated" : "Failed"}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}
