import type { ComponentPropsWithoutRef } from "react";
import sanitizeHtml from "sanitize-html";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { withAmazonAffiliateTag } from "@/lib/utils";

const trackingId = process.env.NEXT_PUBLIC_AMAZON_TRACKING_ID;

function isProbablyHtml(htmlOrMarkdown: string): boolean {
  const t = htmlOrMarkdown.trim();
  if (!t) return false;
  if (t.startsWith("<")) return true;
  return /<\s*\/?\s*(p|div|article|section|h[1-6]|ul|ol|li|br|img|a|strong|em|span|blockquote)\b/i.test(
    htmlOrMarkdown,
  );
}

function isAmazonHref(href: string): boolean {
  try {
    return new URL(href).hostname.includes("amazon.");
  } catch {
    return false;
  }
}

/**
 * Renders body links, rewriting Amazon URLs to carry the affiliate tag and the
 * required rel/target. Without this, inline links the AI writes in the article
 * (e.g. "click here") would point to Amazon with no `tag=` and earn nothing.
 */
function MarkdownAnchor({
  href,
  children,
  title,
}: ComponentPropsWithoutRef<"a">) {
  if (href && isAmazonHref(href)) {
    return (
      <a
        href={withAmazonAffiliateTag(href, trackingId)}
        title={title}
        target="_blank"
        rel="nofollow sponsored noopener noreferrer"
      >
        {children}
      </a>
    );
  }
  return (
    <a href={href} title={title}>
      {children}
    </a>
  );
}

const proseClass =
  "prose prose-neutral dark:prose-invert max-w-none prose-img:rounded-lg prose-a:text-primary";

/** Renders stored HTML (sanitized) or falls back to Markdown for legacy content. */
export function PostBody({ body }: { body: string }) {
  if (isProbablyHtml(body)) {
    return (
      <div
        className={proseClass}
        dangerouslySetInnerHTML={{
          __html: sanitizeHtml(body, {
            allowedTags: sanitizeHtml.defaults.allowedTags.concat([
              "img",
              "h1",
              "h2",
              "h3",
              "h4",
              "h5",
              "h6",
            ]),
            allowedAttributes: {
              ...sanitizeHtml.defaults.allowedAttributes,
              img: ["src", "srcset", "alt", "title", "width", "height", "loading"],
              a: ["href", "name", "target", "rel"],
            },
            transformTags: {
              a: (tagName, attribs) => {
                if (attribs.href && isAmazonHref(attribs.href)) {
                  attribs.href = withAmazonAffiliateTag(attribs.href, trackingId);
                  attribs.target = "_blank";
                  attribs.rel = "nofollow sponsored noopener noreferrer";
                } else if (attribs.target === "_blank") {
                  attribs.rel = "noopener noreferrer";
                }
                return { tagName, attribs };
              },
            },
          }),
        }}
      />
    );
  }

  return (
    <div className={proseClass}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug]}
        components={{ a: MarkdownAnchor }}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}
