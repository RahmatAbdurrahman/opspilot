import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
}

const variantClasses: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default:     "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  secondary:   "bg-white/5 text-[hsl(var(--muted-foreground))] border-white/10",
  destructive: "bg-red-500/15 text-red-400 border-red-500/20",
  outline:     "bg-transparent text-[hsl(var(--foreground))] border-[hsl(var(--border))]",
  success:     "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  warning:     "bg-amber-500/15 text-amber-400 border-amber-500/20",
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium transition-colors",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
