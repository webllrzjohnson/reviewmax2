import Link from "next/link";
import {
  markStaleAutomationRunsFailedAction,
  sendMonthlyAutomationSummaryAction,
} from "@/actions/automation-runs";
import { AutomationSettingsForm } from "@/components/admin/AutomationSettingsForm";
import { DiscoverForm } from "@/components/admin/DiscoverForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getAutomationSettingsForDashboard,
  getMonthlyAutomationSummaryForDashboard,
  getRecentAutomationRuns,
} from "@/lib/automation-data";
import { cn, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AutomationPage() {
  const [runs, settings, monthlySummary] = await Promise.all([
    getRecentAutomationRuns(10),
    getAutomationSettingsForDashboard(),
    getMonthlyAutomationSummaryForDashboard(),
  ]);
  const hasStaleRuns = runs.some((run) => run.displayStatus === "stale");

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Automation
          </h1>
          <p className="mt-1 text-muted-foreground">
            Run product discovery manually, review generated drafts, and inspect
            scheduled automation history.
          </p>
        </div>
        {hasStaleRuns ? (
          <form action={markStaleAutomationRunsFailedAction}>
            <Button variant="outline" type="submit">
              Mark stale runs failed
            </Button>
          </form>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scheduled automation settings</CardTitle>
          <CardDescription>
            Control whether scheduled discovery runs, which categories it rotates
            through, and where notifications go.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AutomationSettingsForm settings={settings} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <DiscoverForm />
        <Card>
          <CardHeader>
            <CardTitle>This month</CardTitle>
            <CardDescription>
              Automation performance for the current UTC month.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <dl className="grid grid-cols-2 gap-3">
              <Metric label="Runs" value={monthlySummary.runs} />
              <Metric label="Drafts" value={monthlySummary.generated} />
              <Metric label="Skipped" value={monthlySummary.skipped} />
              <Metric label="Failed items" value={monthlySummary.failedItems} />
            </dl>
            {settings.monthlySummaryEnabled ? (
              <form action={sendMonthlyAutomationSummaryAction}>
                <Button variant="outline" type="submit">
                  Send monthly summary now
                </Button>
              </form>
            ) : (
              <p className="text-muted-foreground">
                Enable monthly summary above to send this by email.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent automation runs</CardTitle>
          <CardDescription>
            The last 10 product discovery runs, including generated drafts,
            skipped duplicates, and failures.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No automation runs yet. Run discovery above to create the first log.
            </p>
          ) : (
            runs.map((run) => (
              <section key={run.id} className="rounded-lg border p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{run.category}</h2>
                      <RunStatusBadge status={run.displayStatus} />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {run.country} · max {run.maxItems} · started {formatDate(run.startedAt)}
                    </p>
                    {run.summary ? (
                      <p className="mt-2 text-sm">{run.summary}</p>
                    ) : null}
                    {run.displayStatus === "stale" ? (
                      <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                        This run has been running for more than 15 minutes. It
                        likely failed before it could update its status.
                      </p>
                    ) : null}
                    {run.error ? (
                      <p className="mt-2 text-sm text-destructive">{run.error}</p>
                    ) : null}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {run.finishedAt ? "Finished" : run.displayStatus === "stale" ? "Stale" : "Running"}
                  </span>
                </div>

                {run.items.length > 0 ? (
                  <ul className="mt-4 divide-y text-sm">
                    {run.items.map((item) => (
                      <li key={item.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-medium">{item.productName}</p>
                          {item.message ? (
                            <p className="text-muted-foreground">{item.message}</p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <ItemStatusBadge status={item.status} />
                          {item.postSlug ? (
                            <Link
                              href={`/dashboard/posts?search=${encodeURIComponent(item.postSlug)}`}
                              className="text-xs font-medium text-primary underline"
                            >
                              Draft
                            </Link>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RunStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant={status === "success" ? "default" : "outline"}
      className={cn(
        status === "failed" && "border-destructive/50 text-destructive",
        status === "partial" && "border-amber-500/50 text-amber-700 dark:text-amber-300",
        status === "stale" && "border-amber-500/50 text-amber-700 dark:text-amber-300",
      )}
    >
      {status}
    </Badge>
  );
}

function ItemStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant={status === "generated" ? "default" : "secondary"}
      className={cn(status === "failed" && "border-destructive/50 text-destructive")}
    >
      {status}
    </Badge>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-xl font-semibold">{value}</dd>
    </div>
  );
}
