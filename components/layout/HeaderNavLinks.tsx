"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

function navLinkClass(active: boolean) {
  return cn(
    "whitespace-nowrap transition-colors",
    active ? "text-white" : "text-zinc-300 hover:text-white",
  );
}

export function HeaderNavLinks() {
  const pathname = usePathname();

  return (
    <>
      <Link
        href="/blog"
        className={navLinkClass(pathname === "/blog" || pathname.startsWith("/blog/"))}
        aria-current={pathname === "/blog" || pathname.startsWith("/blog/") ? "page" : undefined}
      >
        Reviews
      </Link>
      <Link
        href="/compare"
        className={navLinkClass(pathname === "/compare")}
        aria-current={pathname === "/compare" ? "page" : undefined}
      >
        Compare
      </Link>
      <Link
        href="/best"
        className={navLinkClass(pathname === "/best" || pathname.startsWith("/best/"))}
        aria-current={pathname === "/best" || pathname.startsWith("/best/") ? "page" : undefined}
      >
        Best picks
      </Link>
      <Link href="/#categories" className={navLinkClass(false)}>
        Categories
      </Link>
      <Link
        href="/methodology"
        className={navLinkClass(pathname === "/methodology")}
        aria-current={pathname === "/methodology" ? "page" : undefined}
      >
        How we test
      </Link>
    </>
  );
}
