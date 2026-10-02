"use client";

import { CopyButton } from "@/components/shared/copy-button";
import { Separator } from "@/components/ui/separator";
import { Terminal, AlertTriangle } from "lucide-react";

interface BobHandoffProps {
  title?:           string;
  suggestedCommand: string;
  executionCommand?: string;
  executionLabel?:  string;
  contextNote?:     string;
}

/**
 * IBM Bob handoff section — shared across Customer, Invoice, Task and Action Center drawers.
 * Displays copy-able commands. Does NOT execute anything from the website.
 */
export function BobHandoff({
  title = "Continue securely in IBM Bob",
  suggestedCommand,
  executionCommand,
  executionLabel,
  contextNote,
}: BobHandoffProps) {
  return (
    <div className="space-y-4">
      <Separator />

      <div className="flex items-center gap-2">
        <Terminal className="h-3.5 w-3.5 text-cyan-400 shrink-0" aria-hidden />
        <p className="text-xs font-semibold text-[hsl(var(--foreground))]">
          {title}
        </p>
      </div>

      {/* Suggested command */}
      <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
          Suggested Command
        </p>
        <div className="flex items-center justify-between gap-2">
          <code className="text-sm font-mono font-semibold text-cyan-300 break-all">
            {suggestedCommand}
          </code>
          <CopyButton text={suggestedCommand} />
        </div>
      </div>

      {/* Execution command */}
      {executionCommand && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 space-y-2">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" aria-hidden />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">
              Execution command — requires IBM Bob approval
            </p>
          </div>
          {executionLabel && (
            <p className="text-[11px] text-[hsl(var(--muted-foreground))]">{executionLabel}</p>
          )}
          <div className="flex items-center justify-between gap-2">
            <code className="text-sm font-mono font-semibold text-amber-300 break-all">
              {executionCommand}
            </code>
            <CopyButton text={executionCommand} />
          </div>
        </div>
      )}

      {contextNote && (
        <p className="text-[11px] text-[hsl(var(--muted-foreground))] leading-relaxed">
          {contextNote}
        </p>
      )}

      <p className="text-[11px] text-[hsl(var(--muted-foreground))] leading-relaxed">
        Consequential actions require human approval in IBM Bob.
        Copy the command above and run it in your IBM Bob session.
      </p>
    </div>
  );
}
