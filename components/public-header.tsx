"use client";

import Link from "next/link";
import { BrandLockup } from "@/components/brand-lockup";

export function PublicHeader({
  showAdminLink = true,
  showHomeLink = true,
  centered = false,
}: {
  showAdminLink?: boolean;
  showHomeLink?: boolean;
  centered?: boolean;
}) {
  const brand = (
    <BrandLockup
      subtitle={centered ? undefined : "Employee submissions"}
      className={centered ? "justify-center" : undefined}
    />
  );

  const brandNode =
    showAdminLink || showHomeLink ? (
      <Link href="/" className="min-w-0">
        {brand}
      </Link>
    ) : (
      <div className="min-w-0">{brand}</div>
    );

  return (
    <header className="border-b border-white/10 bg-navy text-white">
      <div
        className={
          centered
            ? "mx-auto flex max-w-5xl items-center justify-center px-4 py-3"
            : "mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-2.5"
        }
      >
        {brandNode}
        {!centered ? (
          showAdminLink ? (
            <Link href="/login" className="shrink-0 text-sm text-white/80 hover:text-white">
              Administrator sign in
            </Link>
          ) : showHomeLink ? (
            <Link href="/" className="shrink-0 text-sm text-white/80 hover:text-white">
              Home
            </Link>
          ) : null
        ) : null}
      </div>
    </header>
  );
}
