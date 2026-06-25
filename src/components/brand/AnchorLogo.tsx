import { cn } from "@/lib/cn";

/** The Anchor mark — radiating right-facing ripple arcs + centre dot, in coral. */
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
      {/* ripple emanating to the right, with the source dot on the left */}
      <circle cx="4.5" cy="12" r="1.7" fill="currentColor" stroke="none" />
      <path d="M4.5 8.5 A3.5 3.5 0 0 1 4.5 15.5" />
      <path d="M4.5 5 A7 7 0 0 1 4.5 19" />
      <path d="M4.5 1.5 A10.5 10.5 0 0 1 4.5 22.5" />
    </svg>
  );
}

/** Full lockup: mark + lowercase "anchor" wordmark, both in the brand coral. */
export function AnchorLogo({
  className,
  size = 24,
  showWord = true,
}: {
  className?: string;
  size?: number;
  showWord?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <AnchorMark size={size} />
      {showWord && (
        <span
          className="font-rounded font-semibold leading-none text-anchor"
          style={{ fontSize: Math.round(size * 0.92), letterSpacing: "-0.01em" }}
        >
          anchor
        </span>
      )}
    </span>
  );
}
