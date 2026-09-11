import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: "info" | "success" | "error" | "warning";
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-lg border px-4 py-3 text-sm",
        tone === "info" && "border-border bg-white text-navy",
        tone === "success" && "border-success/20 bg-success-soft text-success",
        tone === "error" && "border-danger/20 bg-danger-soft text-danger",
        tone === "warning" && "border-warning/30 bg-warning-soft text-warning",
        className,
      )}
    >
      {title ? <p className="font-medium">{title}</p> : null}
      <div className={title ? "mt-1" : ""}>{children}</div>
    </div>
  );
}
