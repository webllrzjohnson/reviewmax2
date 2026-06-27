import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AUTHORS, filterPostsByAuthor, getAuthorBySlug } from "@/lib/authors";
import { getPublishedPosts } from "@/lib/data";
import { ComparePostGrid } from "@/components/review/ComparePostGrid";
import { BreadcrumbNav } from "@/components/common/BreadcrumbNav";
import { siteUrl } from "@/lib/utils";

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return AUTHORS.map((author) => ({ slug: author.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const author = getAuthorBySlug(slug);
  if (!author) return { title: "Author not found" };

  const url = `${siteUrl()}/author/${author.slug}`;
  return {
    title: `${author.name} — ${author.role}`,
    description: author.bio,
    alternates: { canonical: url },
    openGraph: {
      title: `${author.name} | Verdict`,
      description: author.bio,
      url,
      type: "profile",
    },
  };
}

export default async function AuthorPage({ params }: Props) {
  const { slug } = await params;
  const author = getAuthorBySlug(slug);
  if (!author) notFound();

  const allPosts = await getPublishedPosts(200);
  const posts = filterPostsByAuthor(allPosts, author.slug);

  return (
    <div className="space-y-10">
      <BreadcrumbNav
        items={[
          { label: "Home", href: "/" },
          { label: "Reviews", href: "/blog" },
          { label: author.name, href: `/author/${author.slug}` },
        ]}
      />

      <header className="space-y-3 rounded-2xl border bg-card p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {author.role}
        </p>
        <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
          {author.name}
        </h1>
        <p className="max-w-2xl text-muted-foreground">{author.bio}</p>
      </header>

      <section className="space-y-4" aria-labelledby="author-reviews-heading">
        <h2
          id="author-reviews-heading"
          className="font-heading text-2xl font-bold tracking-tight"
        >
          Reviews by {author.name}
        </h2>
        <ComparePostGrid
          posts={posts}
          emptyTitle={`No published reviews from ${author.name} yet.`}
          emptyBody="Check back soon for new reviews."
        />
      </section>
    </div>
  );
}
