"use client";

import { usePathname } from "next/navigation";
import { navigation } from "@/lib/navigation";
import { AskBobPanel } from "@/components/overview/ask-bob-panel";
import { MobileNav } from "@/components/layout/mobile-nav";
import { RefreshDataButton } from "@/components/shared/refresh-data-button";

function getBreadcrumb(pathname: string) {
  if (pathname === "/") return { label: "Overview", description: "Revenue health at a glance" };
  for (const group of navigation) {
    for (const item of group.items) {
      if (item.href !== "/" && pathname.startsWith(item.href)) {
        return { label: item.label, description: item.description };
      }
    }
  }
  return { label: "OpsPilot", description: "" };
}

export function Topbar() {
  const pathname = usePathname();
  const crumb = getBreadcrumb(pathname);

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 sm:px-5">
      {/* Mobile navigation trigger (hidden from md up) */}
      <MobileNav />

      {/* Left: breadcrumb */}
      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        <h1 className="truncate text-sm font-semibold text-[hsl(var(--foreground))]">{crumb.label}</h1>
        {crumb.description && (
          <p className="hidden truncate text-[11px] text-[hsl(var(--muted-foreground))] sm:block">{crumb.description}</p>
        )}
      </div>

      {/* Right: actions */}
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        {/* Re-reads dashboard data only; never triggers an email, calendar event or MCP call */}
        <RefreshDataButton />

        {/* Ask Bob — informational panel; consequential actions are handled by IBM Bob */}
        <AskBobPanel />
      </div>
    </header>
  );
}
