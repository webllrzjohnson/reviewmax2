import { z } from "zod";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Matches seeded category/post IDs (Zod .uuid() rejects non-RFC variant bits). */
const uuidLikeRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const ReviewRequestSchema = z.object({
  product_name: z
    .string()
    .min(2, "Product name is required")
    .max(200, "Product name is too long"),
  category: z
    .string()
    .min(1, "Category is required")
    .regex(slugRegex, "Use a slug like kitchen-gadgets"),
  amazon_url: z.string().url("Enter a valid Amazon product URL"),
  notes: z.string().max(2000).optional(),
});

export type ReviewRequestInput = z.infer<typeof ReviewRequestSchema>;

export const NewsletterSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

export type NewsletterInput = z.infer<typeof NewsletterSchema>;

/** Admin create/edit post form (pros, cons, gallery as newline-separated text). */
export const PostEditorSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(200)
    .regex(slugRegex, "Use lowercase letters, numbers, and hyphens"),
  excerpt: z.string().min(1, "Excerpt is required").max(2000),
  body: z.string().min(1, "Body is required"),
  category_id: z
    .string()
    .regex(uuidLikeRegex, "Select a category"),
  rating: z.number().min(0).max(5),
  pros: z.string().min(1, "Add at least one pro (one per line)"),
  cons: z.string().min(1, "Add at least one con (one per line)"),
  verdict: z.string().min(1, "Verdict is required").max(2000),
  amazon_url: z.string().url("Enter a valid product URL"),
  image_url: z.string().optional(),
  gallery_urls: z.string().optional(),
  badge: z.enum(["editors-choice", "best-value", "top-pick", ""]).optional(),
  faqs: z.string().optional(),
  price_at_review: z.string().max(80).optional(),
  specs: z.string().optional(),
  is_published: z.boolean(),
});

export type PostEditorInput = z.infer<typeof PostEditorSchema>;

export const CategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(100)
    .regex(slugRegex, "Use lowercase letters, numbers, and hyphens"),
  description: z.string().max(500).optional(),
});

export type CategoryInput = z.infer<typeof CategorySchema>;
