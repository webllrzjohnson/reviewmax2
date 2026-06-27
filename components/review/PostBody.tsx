import sanitizeHtml from "sanitize-html";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";

function isProbablyHtml(htmlOrMarkdown: string): boolean {
  const t = htmlOrMarkdown.trim();
  if (!t) return false;
  if (t.startsWith("<")) return true;
  return /<\s*\/?\s*(p|div|article|section|h[1-6]|ul|ol|li|br|img|a|strong|em|span|blockquote)\b/i.test(
    htmlOrMarkdown,
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
                if (attribs.target === "_blank") {
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
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]}>
        {body}
      </ReactMarkdown>
    </div>
  );
}
