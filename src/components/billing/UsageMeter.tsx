"use client";

import { cn } from "@/lib/cn";

export function UsageMeter({
  used,
  limit,
  label = "AI generations this month",
}: {
  used: number;
  limit: number;
  label?: string;
}) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const tone =
    pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-anchor";
  const left = Math.max(0, limit - used);

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] font-medium text-ink-soft">{label}</span>
        <span className="text-[13px] font-semibold text-ink">
          {used} / {limit}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/[0.06]">
        <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1.5 text-[12px] text-ink-faint">
        {left > 0
          ? `${left} left — resets at the start of next month.`
          : "You're out for this month — upgrade for more, or it resets next month."}
      </p>
    </div>
  );
}
