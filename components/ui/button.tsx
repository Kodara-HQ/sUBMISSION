import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
};

const variants = {
  primary: "bg-accent text-white hover:bg-accent-hover disabled:bg-accent/50",
  secondary: "bg-navy text-white hover:bg-navy-700 disabled:bg-navy/50",
  ghost: "bg-transparent text-navy hover:bg-slate-100",
  danger: "bg-danger text-white hover:bg-red-700 disabled:bg-danger/50",
  outline: "border border-border bg-white text-text hover:bg-slate-50",
};

const sizes = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
