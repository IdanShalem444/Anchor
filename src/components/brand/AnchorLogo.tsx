import { cn } from "@/lib/cn";

/** The Anchor mark — three radiating right-facing ripple arcs, in coral. */
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
      strokeWidth={2.3}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("text-anchor", className)}
      aria-hidden="true"
    >
      {/* concentric ripple arcs emanating to the right */}
      <path d="M6 8.5 A3.5 3.5 0 0 1 6 15.5" />
      <path d="M6 5 A7 7 0 0 1 6 19" />
      <path d="M6 1.5 A10.5 10.5 0 0 1 6 22.5" />
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
