import Link from "next/link";
import { getAllReviewRequests } from "@/lib/admin-data";
import { ReviewRequestsTable } from "@/components/admin/ReviewRequestsTable";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function ReviewRequestsPage() {
  const requests = await getAllReviewRequests();
  const publicCount = requests.filter((r) => !r.created_by).length;
  const pendingCount = requests.filter((r) => !r.processed_at).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Review requests
          </h1>
          <p className="mt-1 text-muted-foreground">
            {pendingCount} pending, {requests.length} total — {publicCount}{" "}
            from public suggestions, {requests.length - publicCount} from admin.
            Use <span className="font-medium text-foreground">Process</span> to
            generate a draft review without re-entering it.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/dashboard/new-review">New request</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">← Dashboard</Link>
          </Button>
        </div>
      </div>

      <ReviewRequestsTable requests={requests} />
    </div>
  );
}
