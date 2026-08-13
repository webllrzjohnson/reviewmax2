/**
 * Verdict — shared app types.
 */

export type UserRole = "admin" | "user";

export type AdminRole = UserRole;

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
}

export interface CategoryWithPostCount extends Category {
  post_count: number;
}

export type PostBadge = "editors-choice" | "best-value" | "top-pick";

export interface PostFaq {
  q: string;
  a: string;
}

export interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  category_id: string;
  rating: number | null;
  pros: string[];
  cons: string[];
  verdict: string;
  amazon_url: string;
  image_url: string | null;
  gallery_urls: string[];
  badge: PostBadge | null;
  faqs: PostFaq[];
  price_at_review: string | null;
  specs: Record<string, string>;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PostWithCategory extends Post {
  category: Category | null;
  pinterest_post_log?: PinterestPostLog | null;
}

export interface PinterestPostLog {
  id: string;
  post_id: string;
  status: "success" | "skipped" | "failed" | string;
  board_id: string | null;
  pin_id: string | null;
  pin_url: string | null;
  message: string | null;
  created_at: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  created_at: string;
}

export interface ReviewRequest {
  id: string;
  product_name: string;
  category_slug: string;
  amazon_url: string;
  notes: string | null;
  created_by: string | null;
  processed_at: string | null;
  processed_by: string | null;
  process_error: string | null;
  created_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  role: AdminRole;
}

export interface User {
  id: string;
  email: string;
  role: AdminRole;
  full_name: string | null;
  created_at: string;
}

/** @deprecated Use `User` instead. Kept for backward compatibility in UI copy. */
export interface Profile {
  id: string;
  role: AdminRole;
  full_name: string | null;
  created_at: string;
}
