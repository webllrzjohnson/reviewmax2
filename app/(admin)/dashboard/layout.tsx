import Link from "next/link";
import { SignOutButton } from "@/components/admin/SignOutButton";

export const dynamic = "force-dynamic";

export default function AdminDashboardShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/dashboard" className="font-semibold">
            Admin
          </Link>
          <nav className="flex flex-wrap items-center justify-end gap-3 text-sm sm:gap-4">
            <Link href="/dashboard" className="text-primary hover:underline">
              Home
            </Link>
            <Link href="/dashboard/posts" className="text-primary hover:underline">
              Posts
            </Link>
            <Link
              href="/dashboard/posts/new"
              className="text-primary hover:underline"
            >
              New post
            </Link>
            <Link
              href="/dashboard/categories"
              className="text-primary hover:underline"
            >
              Categories
            </Link>
            <Link
              href="/dashboard/new-review"
              className="text-primary hover:underline"
            >
              New review request
            </Link>
            <Link
              href="/dashboard/discover"
              className="text-primary hover:underline"
            >
              Discover
            </Link>
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground"
            >
              View site
            </Link>
            <SignOutButton />
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</div>
    </>
  );
}
