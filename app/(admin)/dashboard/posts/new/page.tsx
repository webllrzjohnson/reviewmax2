import Link from "next/link";
import { getCategories } from "@/lib/data";
import { PostEditorForm } from "@/components/admin/PostEditorForm";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function NewPostPage() {
  const categories = await getCategories();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            New post
          </h1>
          <p className="mt-1 text-muted-foreground">
            Create a review manually, or generate one from New review.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/posts">← All posts</Link>
        </Button>
      </div>

      <PostEditorForm categories={categories} />
    </div>
  );
}
