"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { PostWithCategory } from "@/types";
import {
  deletePost,
  retryPostImage,
  setPostPublished,
  submitPostToPinterest,
  bulkSetPostsPublished,
  bulkDeletePosts,
  revalidatePostAction,
} from "@/actions/posts";
import { isDirectImageUrl } from "@/lib/image-url";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { normalizeActionResult } from "@/lib/action-result";

export function PostsAdminTable({ posts }: { posts: PostWithCategory[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  if (posts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 p-10 text-center text-sm text-muted-foreground">
        No posts yet.{" "}
        <Link href="/dashboard/posts/new" className="text-primary underline">
          Create one manually
        </Link>{" "}
        or generate one from{" "}
        <Link href="/dashboard/new-review" className="text-primary underline">
          New review
        </Link>
        .
      </div>
    );
  }

  function refresh() {
    router.refresh();
    setSelected(new Set());
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === posts.length ? new Set() : new Set(posts.map((p) => p.id)),
    );
  }

  const selectedIds = Array.from(selected);
  const allSelected = selected.size === posts.length && posts.length > 0;
  const someSelected = selected.size > 0;

  return (
    <div className="space-y-3">
      {someSelected && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-4 py-3">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await bulkSetPostsPublished(selectedIds, true);
                  if (r.ok) {
                    toast.success(r.message);
                  } else {
                    toast.error(r.message);
                  }
                  refresh();
                })
              }
            >
              Publish selected
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await bulkSetPostsPublished(selectedIds, false);
                  if (r.ok) {
                    toast.success(r.message);
                  } else {
                    toast.error(r.message);
                  }
                  refresh();
                })
              }
            >
              Unpublish selected
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive" disabled={pending}>
                  Delete selected
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Delete {selected.size} post{selected.size === 1 ? "" : "s"}?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete {selected.size} post
                    {selected.size === 1 ? "" : "s"}. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() =>
                      startTransition(async () => {
                        const r = await bulkDeletePosts(selectedIds);
                        if (r.ok) {
                          toast.success(r.message);
                        } else {
                          toast.error(r.message);
                        }
                        refresh();
                      })
                    }
                  >
                    Delete permanently
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelected(new Set())}
            >
              Clear selection
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[960px] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-muted-foreground">
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all"
                />
              </th>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Rating</th>
              <th className="px-4 py-3 font-medium">Published</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Pinterest</th>
              <th className="px-4 py-3 font-medium">Image</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr
                key={post.id}
                className={cn(
                  "border-b last:border-0 transition-colors",
                  selected.has(post.id) && "bg-primary/5",
                )}
              >
                <td className="px-4 py-3 align-top">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input"
                    checked={selected.has(post.id)}
                    onChange={() => toggleOne(post.id)}
                    aria-label={`Select ${post.title}`}
                  />
                </td>
                <td className="max-w-[260px] px-4 py-3 align-top">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="font-medium text-primary hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {post.title}
                  </Link>
                </td>
                <td className="px-4 py-3 align-top">
                  {post.category?.name ?? "—"}
                </td>
                <td className="px-4 py-3 align-top tabular-nums">
                  {post.rating != null ? `${post.rating.toFixed(1)} / 5` : "—"}
                </td>
                <td className="px-4 py-3 align-top text-muted-foreground">
                  {post.published_at ? formatDate(post.published_at) : "—"}
                </td>
                <td className="px-4 py-3 align-top">
                  <Badge
                    variant={post.is_published ? "default" : "secondary"}
                    className={cn(
                      !post.is_published && "text-muted-foreground",
                    )}
                  >
                    {post.is_published ? "Published" : "Draft"}
                  </Badge>
                </td>
                <td className="px-4 py-3 align-top">
                  {post.pinterest_post_log ? (
                    <div className="space-y-1">
                      <Badge
                        variant={
                          post.pinterest_post_log.status === "success"
                            ? "default"
                            : "secondary"
                        }
                        className={cn(
                          post.pinterest_post_log.status === "failed" &&
                            "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                          post.pinterest_post_log.status === "skipped" &&
                            "text-muted-foreground",
                        )}
                      >
                        {post.pinterest_post_log.status === "success"
                          ? "Pinned"
                          : post.pinterest_post_log.status === "skipped"
                            ? "Skipped"
                            : "Failed"}
                      </Badge>
                      {post.pinterest_post_log.pin_url ? (
                        <a
                          href={post.pinterest_post_log.pin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-xs text-primary hover:underline"
                        >
                          View pin
                        </a>
                      ) : post.pinterest_post_log.message ? (
                        <p className="max-w-[180px] truncate text-xs text-muted-foreground">
                          {post.pinterest_post_log.message}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3 align-top">
                  {post.image_url && isDirectImageUrl(post.image_url) ? (
                    <span className="text-xs text-green-600">✓</span>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto px-1 py-0 text-xs text-amber-600 hover:text-amber-700"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          toast.loading("Fetching image from Amazon…", {
                            id: `img-${post.id}`,
                          });
                          const result = await retryPostImage(post.id);
                          toast.dismiss(`img-${post.id}`);
                          if (!result.ok) {
                            toast.error(
                              result.message ?? "Could not fetch image.",
                            );
                          } else {
                            toast.success("Image updated.");
                            refresh();
                          }
                        })
                      }
                    >
                      ⚠ Retry
                    </Button>
                  )}
                </td>
                <td className="px-4 py-3 align-top text-right">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/posts/${post.id}/edit`}>
                        Edit
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      title="Clear page cache"
                      onClick={() =>
                        startTransition(async () => {
                          const r = await revalidatePostAction(post.slug);
                          if (r.ok) {
                            toast.success(r.message ?? "Cache cleared.");
                          } else {
                            toast.error(r.message);
                          }
                        })
                      }
                    >
                      ↻
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending || !post.is_published}
                      title={
                        post.is_published
                          ? "Submit this post to Pinterest manually"
                          : "Publish before pinning"
                      }
                      onClick={() =>
                        startTransition(async () => {
                          toast.loading("Submitting to Pinterest…", {
                            id: `pin-${post.id}`,
                          });
                          const result = await submitPostToPinterest(post.id);
                          toast.dismiss(`pin-${post.id}`);

                          if (result.ok) {
                            toast.success(
                              result.message ?? "Pinterest pin created.",
                            );
                          } else {
                            toast.error(
                              result.message ??
                                "Could not submit to Pinterest.",
                            );
                          }
                          refresh();
                        })
                      }
                    >
                      Pin
                    </Button>
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-input"
                        checked={post.is_published}
                        disabled={pending}
                        onChange={() => {
                          startTransition(async () => {
                            const result = await setPostPublished(
                              post.id,
                              !post.is_published,
                            );
                            const safeResult = normalizeActionResult(
                              result,
                              "Could not update status.",
                            );
                            if (!safeResult.ok) {
                              toast.error(safeResult.message);
                              return;
                            }
                            toast.success(
                              safeResult.message ??
                                (post.is_published
                                  ? "Post unpublished."
                                  : "Post published."),
                            );
                            refresh();
                          });
                        }}
                      />
                      Live
                    </label>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          disabled={pending}
                        >
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Delete this post permanently?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            &ldquo;{post.title}&rdquo; will be permanently
                            removed. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() =>
                              startTransition(async () => {
                                const result = await deletePost(post.id);
                                if (!result.ok) {
                                  toast.error(
                                    result.message ?? "Could not delete post.",
                                  );
                                  return;
                                }
                                toast.success("Post deleted.");
                                refresh();
                              })
                            }
                          >
                            Delete permanently
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
