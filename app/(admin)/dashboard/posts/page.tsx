import Link from "next/link";
import { getAdminPostsPage } from "@/lib/admin-data";
import { parseAdminPostsPagination } from "@/lib/admin-posts-pagination";
import { PostsAdminTable } from "@/components/admin/PostsAdminTable";
import { RevalidateSiteButton } from "@/components/admin/RevalidateSiteButton";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type AdminPostsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminPostsPage({
  searchParams,
}: AdminPostsPageProps) {
  const pagination = parseAdminPostsPagination(await searchParams);
  const postsPage = await getAdminPostsPage(pagination);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Posts
          </h1>
          <p className="mt-1 text-muted-foreground">
            Edit, publish, delete, or create reviews manually.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/dashboard/posts/new">New post</Link>
          </Button>
          <RevalidateSiteButton />
          <Button asChild variant="outline">
            <Link href="/dashboard">← Dashboard</Link>
          </Button>
        </div>
      </div>

      <PostsAdminTable
        posts={postsPage.posts}
        pagination={{
          page: postsPage.page,
          pageSize: postsPage.pageSize,
          pageCount: postsPage.pageCount,
          total: postsPage.total,
        }}
      />
    </div>
  );
}
