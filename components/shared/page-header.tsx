import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, icon: Icon, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-x-4 gap-y-3", className)}>
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20">
            <Icon className="h-4.5 w-4.5 text-cyan-400" />
          </div>
        )}
        <div>
          <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] tracking-tight">{title}</h2>
          {description && (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
