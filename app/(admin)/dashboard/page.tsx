import Link from "next/link";
import { getAdminDashboardData } from "@/lib/admin-data";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn, formatDate } from "@/lib/utils";
import {
  getReviewRequestStatus,
  reviewRequestStatusLabel,
} from "@/lib/review-request-status";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { email, stats, recentRequests } = await getAdminDashboardData();

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1 text-muted-foreground">
            Signed in as{" "}
            <span className="font-medium text-foreground">{email}</span>.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="default">
            <Link href="/dashboard/new-review">New review request</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/posts/new">Create post</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/posts">Manage posts</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/review-requests">Review queue</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/newsletter">Newsletter</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/automation">Automation</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total posts" value={stats.posts} />
        <StatCard label="Categories" value={stats.categories} />
        <StatCard label="Newsletter subscribers" value={stats.subscribers} />
        <StatCard
          label="Pending review requests"
          value={stats.pendingReviewRequests}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent review requests</CardTitle>
          <CardDescription>
            Last 10 items.{" "}
            <Link href="/dashboard/review-requests" className="text-primary underline">
              View all requests →
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {recentRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No review requests yet.{" "}
              <Link href="/dashboard/new-review" className="text-primary underline">
                Create one
              </Link>{" "}
              to test your pipeline.
            </p>
          ) : (
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Product</th>
                  <th className="pb-3 pr-4 font-medium">Category</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 pr-4 font-medium">Amazon URL</th>
                  <th className="pb-3 pr-4 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {recentRequests.map((r) => {
                  const status = getReviewRequestStatus(r);
                  return (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-3 pr-4 align-top font-medium">
                      {r.product_name}
                    </td>
                    <td className="py-3 pr-4 align-top">{r.category_slug}</td>
                    <td className="py-3 pr-4 align-top">
                      <Badge
                        variant={
                          status === "processed"
                            ? "default"
                            : status === "failed"
                              ? "outline"
                              : "secondary"
                        }
                        className={cn(
                          status === "failed" &&
                            "border-destructive/50 text-destructive",
                        )}
                      >
                        {reviewRequestStatusLabel(status)}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 align-top">
                      <a
                        href={r.amazon_url}
                        className="max-w-[200px] truncate text-primary underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {r.amazon_url}
                      </a>
                    </td>
                    <td className="py-3 pr-4 align-top text-muted-foreground">
                      {formatDate(r.created_at)}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
