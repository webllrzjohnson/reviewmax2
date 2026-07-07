import Link from "next/link";
import { auth } from "@/auth";
import { getCategoriesWithPublishedPosts } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { HeaderNavMobile } from "@/components/layout/HeaderNavMobile";
import { HeaderNavLinks } from "@/components/layout/HeaderNavLinks";
import { CommandSearch } from "@/components/common/CommandSearch";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export async function Header({ className }: { className?: string }) {
  const [categories, session] = await Promise.all([
    getCategoriesWithPublishedPosts(),
    auth(),
  ]);
  const adminHref = session?.user?.role === "admin" ? "/dashboard" : "/login";
  const adminLabel = session?.user?.role === "admin" ? "Dashboard" : "Admin";

  return (
    <header className={cn("sticky top-0 z-40 w-full border-b border-zinc-800 bg-zinc-900", className)}>
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 sm:gap-4 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
          <Link
            href="/"
            className="shrink-0 font-heading text-xl font-bold tracking-tight text-[#C98B1A] transition-colors hover:text-[#D4981E]"
          >
            Verdict
          </Link>
          <HeaderNavMobile categories={categories} />
        </div>

        <nav className="hidden flex-[2] items-center justify-center gap-3 text-sm font-medium lg:gap-5 xl:gap-6 md:flex" aria-label="Main">
          <HeaderNavLinks />
        </nav>

        <div className="flex flex-1 items-center justify-end gap-1 sm:gap-2">
          <ThemeToggle />
          <CommandSearch />
          <Button size="sm" asChild className="hidden border border-zinc-600 bg-transparent text-zinc-200 hover:bg-zinc-700 hover:text-white sm:inline-flex">
            <Link href={adminHref}>{adminLabel}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
