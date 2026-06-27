/** Renders a product's key specs as a definition table on the review page. */
export function SpecList({ specs }: { specs: Record<string, string> }) {
  const entries = Object.entries(specs ?? {}).filter(
    ([key, value]) => key.trim() && String(value).trim(),
  );

  if (entries.length === 0) return null;

  return (
    <section className="space-y-4" aria-labelledby="specs-heading">
      <h2 id="specs-heading" className="text-xl font-bold">
        Specs
      </h2>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full border-collapse text-sm">
          <tbody>
            {entries.map(([key, value]) => (
              <tr key={key} className="border-b last:border-0">
                <th
                  scope="row"
                  className="w-2/5 px-4 py-3 text-left font-medium text-muted-foreground"
                >
                  {key}
                </th>
                <td className="px-4 py-3">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
