"use client";

import { cn } from "@/lib/utils";
import { NavList, SidebarBrand, SidebarFooter } from "@/components/layout/nav-list";

interface SidebarProps {
  className?: string;
}

/** Permanent desktop sidebar (md and up). Mobile uses MobileNav instead. */
export function Sidebar({ className }: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-full w-[220px] shrink-0 flex-col border-r border-[hsl(var(--border))] bg-[hsl(220,28%,7%)]",
        className,
      )}
    >
      <SidebarBrand />
      <NavList activeLayoutId="sidebar-active" />
      <SidebarFooter />
    </aside>
  );
}
