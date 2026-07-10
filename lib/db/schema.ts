import { relations, sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["admin", "user"]);
export const automationRunStatusEnum = pgEnum("automation_run_status", [
  "running",
  "success",
  "failed",
  "partial",
]);
export const automationRunTypeEnum = pgEnum("automation_run_type", [
  "product_discovery",
]);
export const automationRunItemStatusEnum = pgEnum("automation_run_item_status", [
  "generated",
  "skipped",
  "failed",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("user"),
  fullName: text("full_name"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  excerpt: text("excerpt").notNull(),
  body: text("body").notNull(),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "restrict" }),
  rating: numeric("rating", { precision: 2, scale: 1 }),
  pros: text("pros").array().notNull().default(sql`'{}'::text[]`),
  cons: text("cons").array().notNull().default(sql`'{}'::text[]`),
  verdict: text("verdict").notNull(),
  amazonUrl: text("amazon_url").notNull(),
  imageUrl: text("image_url"),
  galleryUrls: text("gallery_urls")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  badge: text("badge"),
  faqs: jsonb("faqs").notNull().default(sql`'[]'::jsonb`),
  priceAtReview: text("price_at_review"),
  specs: jsonb("specs").notNull().default(sql`'{}'::jsonb`),
  isPublished: boolean("is_published").notNull().default(false),
  publishedAt: timestamp("published_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export const reviewFeedback = pgTable("review_feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  postSlug: text("post_slug").notNull(),
  helpful: boolean("helpful").notNull(),
  fingerprint: text("fingerprint").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export const reviewRequests = pgTable("review_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  productName: text("product_name").notNull(),
  categorySlug: text("category_slug").notNull(),
  amazonUrl: text("amazon_url").notNull(),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => users.id, {
    onDelete: "set null",
  }),
  processedAt: timestamp("processed_at", { withTimezone: true, mode: "string" }),
  processedBy: uuid("processed_by").references(() => users.id, {
    onDelete: "set null",
  }),
  processError: text("process_error"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export const automationRuns = pgTable("automation_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: automationRunTypeEnum("type").notNull(),
  status: automationRunStatusEnum("status").notNull().default("running"),
  category: text("category").notNull(),
  country: text("country").notNull(),
  maxItems: integer("max_items").notNull().default(3),
  summary: text("summary"),
  error: text("error"),
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  startedBy: uuid("started_by").references(() => users.id, {
    onDelete: "set null",
  }),
  startedAt: timestamp("started_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true, mode: "string" }),
});

export const automationRunItems = pgTable("automation_run_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id")
    .notNull()
    .references(() => automationRuns.id, { onDelete: "cascade" }),
  productName: text("product_name").notNull(),
  amazonUrl: text("amazon_url"),
  status: automationRunItemStatusEnum("status").notNull(),
  postSlug: text("post_slug"),
  message: text("message"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export const automationSettings = pgTable("automation_settings", {
  id: text("id").primaryKey().default("default"),
  enabled: boolean("enabled").notNull().default(true),
  categories: text("categories").array().notNull().default(sql`'{}'::text[]`),
  country: text("country").notNull().default("United States"),
  notificationEmail: text("notification_email"),
  notifyOnRun: boolean("notify_on_run").notNull().default(false),
  monthlySummaryEnabled: boolean("monthly_summary_enabled").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export const categoriesRelations = relations(categories, ({ many }) => ({
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  category: one(categories, {
    fields: [posts.categoryId],
    references: [categories.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  reviewRequests: many(reviewRequests),
  automationRuns: many(automationRuns),
}));

export const reviewRequestsRelations = relations(reviewRequests, ({ one }) => ({
  creator: one(users, {
    fields: [reviewRequests.createdBy],
    references: [users.id],
  }),
}));

export const automationRunsRelations = relations(automationRuns, ({ many, one }) => ({
  items: many(automationRunItems),
  starter: one(users, {
    fields: [automationRuns.startedBy],
    references: [users.id],
  }),
}));

export const automationRunItemsRelations = relations(automationRunItems, ({ one }) => ({
  run: one(automationRuns, {
    fields: [automationRunItems.runId],
    references: [automationRuns.id],
  }),
}));
