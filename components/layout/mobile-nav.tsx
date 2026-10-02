"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavList, SidebarBrand, SidebarFooter } from "@/components/layout/nav-list";

/**
 * Mobile navigation (< md): a menu button plus a slide-over drawer.
 * Radix Dialog provides Escape-to-close, focus trap, inert background and
 * scroll lock. Links close the drawer on navigation.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);

  // If the viewport grows to desktop width, the permanent sidebar takes over.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="ghost" size="icon-sm" className="md:hidden" aria-label="Open navigation">
          <Menu className="h-4 w-4" />
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="mobile-nav-overlay fixed inset-0 z-40 bg-black/60 md:hidden" />
        <Dialog.Content
          aria-describedby={undefined}
          className="mobile-nav-panel fixed inset-y-0 left-0 z-50 flex h-dvh w-[280px] max-w-[85vw] flex-col border-r border-[hsl(var(--border))] bg-[hsl(220,28%,7%)] shadow-2xl md:hidden"
        >
          <Dialog.Title className="sr-only">Navigation</Dialog.Title>
          <div className="relative shrink-0">
            <SidebarBrand />
            <Dialog.Close asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="absolute right-3 top-3.5"
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>
          <NavList activeLayoutId="mobile-nav-active" onNavigate={() => setOpen(false)} />
          <SidebarFooter />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
