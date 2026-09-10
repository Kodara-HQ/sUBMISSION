import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Alert({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "success" | "error";
  title?: string;
  children: ReactNode;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-lg border px-4 py-3 text-sm",
        tone === "info" && "border-border bg-white text-navy",
        tone === "success" && "border-success/20 bg-success-soft text-success",
        tone === "error" && "border-danger/20 bg-danger-soft text-danger",
      )}
    >
      {title ? <p className="font-medium">{title}</p> : null}
      <div className={title ? "mt-1" : ""}>{children}</div>
    </div>
  );
}
