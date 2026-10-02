"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { refreshOpsPilotData } from "@/lib/opspilot/refresh";

interface RefreshDataButtonProps {
  /** Visible text (hidden on small screens when `compact`). */
  label?: string;
  /** Accessible name; defaults to "Refresh dashboard data". */
  ariaLabel?: string;
  /** Show only the icon below the sm breakpoint. */
  compact?: boolean;
  variant?: "ghost" | "outline";
  className?: string;
}

/**
 * Refreshes dashboard visibility data only: it expires the short server-side
 * data cache and re-renders the current page. It never triggers an email,
 * calendar event or MCP call.
 */
export function RefreshDataButton({
  label = "Refresh",
  ariaLabel = "Refresh dashboard data",
  compact = true,
  variant = "ghost",
  className,
}: RefreshDataButtonProps) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      className={cn("gap-1.5", compact && "max-sm:w-7 max-sm:px-0", className)}
      onClick={() => startTransition(async () => { await refreshOpsPilotData(); })}
      disabled={pending}
      aria-label={ariaLabel}
      aria-busy={pending}
      title="Reload the latest operational data"
    >
      <RefreshCw className={cn("h-3.5 w-3.5", pending && "animate-spin")} aria-hidden />
      <span className={cn(compact && "max-sm:sr-only")}>{pending ? "Refreshing…" : label}</span>
    </Button>
  );
}
