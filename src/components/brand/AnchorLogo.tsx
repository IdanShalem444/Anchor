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
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("text-anchor", className)}
      aria-hidden="true"
    >
      <circle cx="12" cy="5" r="2.4" />
      <line x1="12" y1="7.4" x2="12" y2="21" />
      <line x1="7.5" y1="11.5" x2="16.5" y2="11.5" />
      <path d="M5 14.5a7 7 0 0 0 14 0" />
      <line x1="5" y1="14.5" x2="3.2" y2="14.5" />
      <line x1="19" y1="14.5" x2="20.8" y2="14.5" />
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
