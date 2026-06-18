/** Curated subject colour palette — calm, distinct, Apple-like. */
export const SUBJECT_COLORS = [
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#d946ef", // fuchsia
  "#ec4899", // pink
  "#10b981", // emerald
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#f59e0b", // amber
  "#84cc16", // lime
  "#ef4444", // red
  "#64748b", // slate
] as const;

/** Hex → {r,g,b} */
function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const n = parseInt(
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h,
    16
  );
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r: number, g: number, b: number) {
  const c = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Mix a colour toward white (amount>0) or black (amount<0). -1..1 */
export function shade(hex: string, amount: number) {
  const { r, g, b } = hexToRgb(hex);
  const target = amount >= 0 ? 255 : 0;
  const t = Math.abs(amount);
  return rgbToHex(
    r + (target - r) * t,
    g + (target - g) * t,
    b + (target - b) * t
  );
}

/**
 * Derive an assessment sub-tag colour from the subject colour, varying the
 * shade by index so each assessment reads as a shade of the subject family.
 */
export function assessmentShade(subjectColor: string, index: number) {
  const steps = [0, 0.22, -0.16, 0.38, -0.3, 0.1];
  return shade(subjectColor, steps[index % steps.length]);
}

/** rgba string helper for inline styles. */
export function withAlpha(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}
