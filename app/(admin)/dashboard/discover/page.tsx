import { DiscoverForm } from "@/components/admin/DiscoverForm";

export const dynamic = "force-dynamic";

export default function DiscoverPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Discover products</h1>
        <p className="text-muted-foreground">
          Bulk-generate draft reviews for the top Amazon products in a category.
        </p>
      </div>
      <DiscoverForm />
    </div>
  );
}
