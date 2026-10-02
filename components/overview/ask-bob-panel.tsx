"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DetailDrawer } from "@/components/shared/detail-drawer";
import { Zap, Terminal } from "lucide-react";

const EXAMPLE_COMMANDS = [
  { cmd: "What needs my attention today?", desc: "Surface operational priorities from the dashboard" },
  { cmd: "Handle INV-<ID>",                desc: "Draft a payment follow-up for an invoice (use the ID from this dashboard)" },
  { cmd: "CREATE TASK-<ID>",               desc: "Create a calendar reminder for a task (use the ID from this dashboard)" },
  { cmd: "SEND INV-<ID>",                  desc: "Send a prepared Gmail draft after reviewing it in IBM Bob" },
];

export function AskBobPanel() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/50"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        <Zap className="h-3.5 w-3.5" aria-hidden />
        Ask Bob
      </Button>

      <DetailDrawer
        open={open}
        onClose={() => setOpen(false)}
        title="Ask Bob"
        subtitle="Commands for IBM Bob"
        className="max-w-sm"
      >
        <div className="px-5 py-5 space-y-6">
          {/* Explanation */}
          <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-4 py-4 space-y-2">
            <p className="text-sm font-semibold text-cyan-400">
              Operational actions run through IBM Bob
            </p>
            <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
              Consequential actions — sending emails, creating calendar events,
              drafting follow-ups — are executed by IBM Bob with human approval.
            </p>
            <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
              This dashboard is the visibility and decision-support layer.
              Use the commands below directly in IBM Bob.
            </p>
          </div>

          <Separator />

          {/* Example commands */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
              Example Commands for IBM Bob
            </p>
            <ul className="space-y-2">
              {EXAMPLE_COMMANDS.map(({ cmd, desc }) => (
                <li key={cmd} className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-3 py-2.5">
                  <div className="flex items-start gap-2">
                    <Terminal className="h-3.5 w-3.5 mt-0.5 shrink-0 text-cyan-400" aria-hidden />
                    <div className="min-w-0">
                      <p className="text-xs font-mono font-semibold text-[hsl(var(--foreground))] break-words">
                        {cmd}
                      </p>
                      <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
                        {desc}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <Separator />

          <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-4 py-4 space-y-2">
            <p className="text-xs font-semibold text-[hsl(var(--foreground))]">How it works</p>
            <ol className="space-y-1.5 text-xs text-[hsl(var(--muted-foreground))] list-decimal list-inside leading-relaxed">
              <li>Identify the item from this dashboard</li>
              <li>Type the command in IBM Bob</li>
              <li>Bob prepares the action for your review</li>
              <li>You review and approve before execution</li>
            </ol>
          </div>
        </div>
      </DetailDrawer>
    </>
  );
}
