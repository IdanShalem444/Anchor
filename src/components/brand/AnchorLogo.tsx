import { cn } from "@/lib/cn";

/** The Anchor mark — a clean, minimalist anchor in the brand orange. */
export function AnchorMark({
  className,
  size = 24,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("text-anchor", className)}
      aria-hidden="true"
    >
      {/* radiating concentric arcs (ripple) + centre dot */}
      <circle cx="4.5" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <path d="M4.5 8 A4 4 0 0 1 4.5 16" />
      <path d="M4.5 4.5 A7.5 7.5 0 0 1 4.5 19.5" />
      <path d="M4.5 1 A11 11 0 0 1 4.5 23" />
    </svg>
  );
}

/** Full lockup: mark + wordmark. */
export function AnchorLogo({
  className,
  size = 22,
  showWord = true,
}: {
  className?: string;
  size?: number;
  showWord?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-white/70 shadow-soft ring-1 ring-black/[0.04]">
        <AnchorMark size={size} />
      </span>
      {showWord && (
        <span className="text-[17px] font-semibold tracking-tight text-ink">
          Anchor
        </span>
      )}
    </span>
  );
}
