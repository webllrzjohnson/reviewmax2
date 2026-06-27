import { ClipboardCheck } from "lucide-react";

/**
 * Transparency block shown on every review. Discloses the AI-assisted,
 * editor-reviewed process, states what the verdict is (and isn't) based on, and
 * links to the full methodology. This turns Verdict's honesty policy into a
 * visible trust signal rather than a gap.
 */
export function EvaluationNote({
  categoryName,
}: {
  categoryName?: string | null;
}) {
  const scope = categoryName ? categoryName.toLowerCase() : "this category";

  return (
    <section
      className="rounded-xl border bg-muted/30 p-5"
      aria-labelledby="evaluation-note-heading"
    >
      <div className="flex items-center gap-2">
        <ClipboardCheck className="h-5 w-5 text-primary" aria-hidden />
        <h2 id="evaluation-note-heading" className="text-lg font-bold">
          How we evaluate
        </h2>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        This review is produced with AI assistance and checked by our editorial
        team before publishing. Our verdict weighs the product&apos;s listed
        features, manufacturer specifications, and aggregated buyer feedback
        against comparable options in {scope}. We do not publish fabricated lab
        results; where we have not hands-on tested a unit, we say so. See our{" "}
        <a
          href="/methodology"
          className="font-medium text-foreground underline-offset-2 hover:underline"
        >
          full review methodology
        </a>{" "}
        for how ratings are assigned.
      </p>
    </section>
  );
}
