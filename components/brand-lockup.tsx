import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandLockup({
  subtitle,
  compact = false,
  tone = "onDark",
  className,
}: {
  subtitle?: string;
  compact?: boolean;
  tone?: "onDark" | "onLight";
  className?: string;
}) {
  const titleClass = tone === "onDark" ? "text-white" : "text-navy";
  const subtitleClass = tone === "onDark" ? "text-white/75" : "text-muted";

  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-black/5",
          compact ? "h-10 w-10 p-1" : "h-11 w-11 p-1.5",
        )}
      >
        <Image
          src="/bloj-logo.png"
          alt="Bloj Company LTD"
          width={compact ? 32 : 36}
          height={compact ? 32 : 36}
          className="h-full w-full object-contain"
          priority={!compact}
        />
      </span>
      <div className="min-w-0">
        <p
          className={cn(
            "truncate font-semibold tracking-tight leading-tight",
            titleClass,
            compact ? "text-sm" : "text-[15px] sm:text-base",
          )}
        >
          Bloj Company LTD
        </p>
        {subtitle ? (
          <p className={cn("mt-0.5 truncate text-[11px] font-medium tracking-wide", subtitleClass)}>
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}
