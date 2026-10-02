/** Shared labelled field used in all detail drawers. Server-safe (no "use client"). */
export function DrawerField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
        {label}
      </span>
      <span className="text-sm text-[hsl(var(--foreground))]">{value ?? "—"}</span>
    </div>
  );
}
