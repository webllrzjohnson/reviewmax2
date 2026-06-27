"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ReviewRequestSchema,
  type ReviewRequestInput,
} from "@/lib/validations";
import { submitReviewRequestAction } from "@/actions/review-request";
import type { Category } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function NewReviewForm({ categories }: { categories: Category[] }) {
  const defaultCategory = categories[0]?.slug ?? "";
  const [submitState, setSubmitState] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  const form = useForm<ReviewRequestInput>({
    resolver: zodResolver(ReviewRequestSchema),
    defaultValues: {
      product_name: "",
      category: defaultCategory,
      amazon_url: "",
      notes: "",
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  async function onSubmit(values: ReviewRequestInput) {
    setSubmitState(null);
    try {
      const result = await submitReviewRequestAction(values);
      const message =
        result.message ?? (result.ok ? "Saved." : "Request failed.");
      setSubmitState({ ok: result.ok, message });
      if (result.ok) {
        reset({
          product_name: "",
          category: defaultCategory || values.category,
          amazon_url: "",
          notes: "",
        });
      }
    } catch {
      setSubmitState({
        ok: false,
        message: "Could not reach the server. Check your connection and try again.",
      });
    }
  }

  if (submitState?.ok) {
    return (
      <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/30">
        <CardHeader>
          <CardTitle className="text-emerald-800 dark:text-emerald-100">
            Request submitted
          </CardTitle>
          <CardDescription className="text-emerald-900/80 dark:text-emerald-100/80">
            {submitState.message}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button asChild variant="default">
            <Link
              href="/dashboard/new-review"
              onClick={() => setSubmitState(null)}
            >
              Submit another
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review request</CardTitle>
        <CardDescription>
          Saves to <code>review_requests</code> and generates a draft review
          with AI (requires <code>OPENAI_API_KEY</code>). The draft is saved
          unpublished for you to review and publish.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="product_name">Product name</Label>
            <Input
              id="product_name"
              autoComplete="off"
              placeholder="e.g. AeroPress XL"
              {...register("product_name")}
            />
            {errors.product_name ? (
              <p className="text-sm text-destructive" role="alert">
                {errors.product_name.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("category")}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.category ? (
              <p className="text-sm text-destructive" role="alert">
                {errors.category.message}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Stored as <code>category_slug</code> in the database.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amazon_url">Amazon product URL</Label>
            <Input
              id="amazon_url"
              type="url"
              placeholder="https://www.amazon.com/dp/..."
              {...register("amazon_url")}
            />
            {errors.amazon_url ? (
              <p className="text-sm text-destructive" role="alert">
                {errors.amazon_url.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Audience, comparisons, tone…"
              rows={4}
              {...register("notes")}
            />
            {errors.notes ? (
              <p className="text-sm text-destructive" role="alert">
                {errors.notes.message}
              </p>
            ) : null}
          </div>

          {submitState && !submitState.ok ? (
            <p className="text-sm text-destructive" role="alert">
              {submitState.message}
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={isSubmitting}
            className={cn("w-full sm:w-auto")}
          >
            {isSubmitting ? "Generating…" : "Generate review"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
