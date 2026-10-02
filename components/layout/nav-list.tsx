"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { navigation } from "@/lib/navigation";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot } from "lucide-react";

/** Brand block shared by the desktop sidebar and the mobile navigation drawer. */
export function SidebarBrand() {
  return (
    <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-[hsl(var(--border))] px-4">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-cyan-500/25 bg-cyan-500/15">
        <Bot className="h-4 w-4 text-cyan-400" aria-hidden />
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-sm font-semibold tracking-tight text-white">OpsPilot</span>
        <span className="text-[10px] uppercase tracking-wide text-[hsl(var(--muted-foreground))]">Revenue Ops</span>
      </div>
    </div>
  );
}

/**
 * Navigation links, driven by lib/navigation.ts — the single navigation config.
 * `activeLayoutId` keeps the animated highlight of the two instances
 * (desktop sidebar / mobile drawer) from interfering with each other.
 */
export function NavList({
  onNavigate,
  activeLayoutId,
}: {
  onNavigate?: () => void;
  activeLayoutId: string;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main navigation" className="min-h-0 flex-1 overflow-y-auto px-2 py-4">
      {navigation.map((group, gi) => (
        <div key={gi} className={cn(gi > 0 && "mt-5")}>
          {group.label && (
            <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
              {group.label}
            </p>
          )}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-all duration-150",
                      isActive
                        ? "bg-cyan-500/10 text-cyan-400"
                        : "text-[hsl(var(--muted-foreground))] hover:bg-white/5 hover:text-[hsl(var(--foreground))]",
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId={activeLayoutId}
                        className="absolute inset-0 rounded-md border border-cyan-500/15 bg-cyan-500/10"
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                      />
                    )}
                    <Icon
                      aria-hidden
                      className={cn(
                        "relative z-10 h-4 w-4 shrink-0 transition-colors",
                        isActive ? "text-cyan-400" : "text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))]",
                      )}
                    />
                    <span className="relative z-10 flex-1 truncate font-medium">{item.label}</span>
                    {item.badge !== undefined && (
                      <Badge
                        variant={isActive ? "default" : "secondary"}
                        className="relative z-10 h-4.5 min-w-[18px] px-1.5 text-[10px]"
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** Workspace identity block (no fake account details). */
export function SidebarFooter() {
  return (
    <div className="shrink-0 px-2 pb-4">
      <Separator className="mb-3" />
      <div className="flex items-center gap-2.5 px-2 py-1.5">
        <Avatar size="sm">
          <AvatarFallback className="bg-cyan-500/15 text-[10px] font-bold text-cyan-400">OP</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col leading-none">
          <span className="truncate text-xs font-medium text-[hsl(var(--foreground))]">OpsPilot</span>
          <span className="truncate text-[10px] text-[hsl(var(--muted-foreground))]">Revenue operations workspace</span>
        </div>
      </div>
    </div>
  );
}
