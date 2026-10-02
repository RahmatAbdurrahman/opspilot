"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DetailDrawerProps {
  open:      boolean;
  onClose:   () => void;
  title:     React.ReactNode;
  subtitle?: React.ReactNode;
  badge?:    React.ReactNode;
  children:  React.ReactNode;
  className?: string;
}

/**
 * Shared right-side detail drawer (Customers, Invoices, Tasks, Actions,
 * Activity, Priorities, Ask Bob).
 *
 * Built on Radix Dialog so every drawer gets, consistently:
 *   - Escape and backdrop click to close
 *   - focus trap + focus return to the trigger
 *   - background scroll lock and inert background (aria-modal)
 * It renders in a portal, so it is never positioned relative to an animated
 * page ancestor and always covers the sidebar and topbar.
 * Full width on mobile, max-w-md on larger screens.
 */
export function DetailDrawer({
  open,
  onClose,
  title,
  subtitle,
  badge,
  children,
  className,
}: DetailDrawerProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                key="drawer-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-40 bg-black/50"
              />
            </Dialog.Overlay>

            <Dialog.Content asChild forceMount aria-describedby={undefined}>
              <motion.aside
                key="drawer-panel"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                className={cn(
                  "fixed right-0 top-0 z-50 flex h-dvh w-full max-w-md flex-col border-l border-[hsl(var(--border))] bg-[hsl(220,28%,7%)] shadow-2xl",
                  className,
                )}
              >
                {/* Header */}
                <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-[hsl(var(--border))] px-5">
                  <div className="flex min-w-0 flex-col leading-none">
                    <div className="flex min-w-0 items-center gap-2">
                      <Dialog.Title className="truncate text-sm font-semibold text-[hsl(var(--foreground))]">
                        {title}
                      </Dialog.Title>
                      {badge}
                    </div>
                    {subtitle && (
                      <p className="mt-0.5 truncate text-[11px] text-[hsl(var(--muted-foreground))]">{subtitle}</p>
                    )}
                  </div>
                  <Dialog.Close asChild>
                    <Button variant="ghost" size="icon-sm" aria-label="Close" className="shrink-0">
                      <X className="h-4 w-4" />
                    </Button>
                  </Dialog.Close>
                </div>

                {/* Scrollable body — scroll stays inside the drawer */}
                <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
                  {children}
                </div>
              </motion.aside>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
