"use client";

import { cn } from "@/lib/cn";

type Tone = "neutral" | "anchor" | "green" | "amber" | "red" | "blue";

const tones: Record<Tone, string> = {
  neutral: "bg-black/[0.05] text-ink-soft",
  anchor: "bg-anchor/10 text-anchor-700",
  green: "bg-emerald-500/12 text-emerald-700",
  amber: "bg-amber-500/15 text-amber-700",
  red: "bg-red-500/12 text-red-600",
  blue: "bg-blue-500/12 text-blue-700",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium leading-none",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/** Colour-coded tag used for subjects and assessments. Accepts any hex colour. */
export function Tag({
  color,
  label,
  size = "md",
  className,
}: {
  color: string;
  label: string;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium leading-none",
        size === "sm" ? "px-2 py-0.5 text-[10.5px]" : "px-2.5 py-1 text-[11.5px]",
        className
      )}
      style={{
        backgroundColor: `${color}1f`,
        color: color,
        boxShadow: `inset 0 0 0 1px ${color}33`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

export function Dot({ color, className }: { color: string; className?: string }) {
  return (
    <span
      className={cn("inline-block h-2.5 w-2.5 rounded-full", className)}
      style={{ backgroundColor: color }}
    />
  );
}
