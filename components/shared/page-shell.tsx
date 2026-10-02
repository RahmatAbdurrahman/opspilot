"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
}

export function PageShell({ children, className }: PageShellProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn("flex flex-col gap-6 p-6", className)}
    >
      {children}
    </motion.div>
  );
}
