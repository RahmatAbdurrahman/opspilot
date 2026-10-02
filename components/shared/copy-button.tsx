"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

interface CopyButtonProps {
  text:  string;
  label?: string;
  size?: "sm" | "xs";
}

export function CopyButton({ text, label = "Copy Command", size = "sm" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <Button
      variant="outline"
      size={size === "xs" ? "sm" : "sm"}
      className="gap-1.5 h-7 text-xs shrink-0"
      onClick={handleCopy}
      aria-label={`Copy: ${text}`}
    >
      {copied ? (
        <Check className="h-3 w-3 text-emerald-400" aria-hidden />
      ) : (
        <Copy className="h-3 w-3" aria-hidden />
      )}
      {copied ? "Copied" : label}
    </Button>
  );
}
