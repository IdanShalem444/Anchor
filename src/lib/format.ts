import { customAlphabet } from "nanoid";

const nano = customAlphabet(
  "0123456789abcdefghijklmnopqrstuvwxyz",
  12
);

/** Short unique id. */
export function uid(prefix = "") {
  return prefix ? `${prefix}_${nano()}` : nano();
}

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function parseDate(iso?: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

export function weekdayName(iso?: string | null) {
  const d = parseDate(iso);
  return d ? WEEKDAYS[d.getDay()] : "—";
}

export function formatDate(iso?: string | null, opts?: Intl.DateTimeFormatOptions) {
  const d = parseDate(iso);
  if (!d) return "No date";
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...opts,
  });
}

export function formatShort(iso?: string | null) {
  const d = parseDate(iso);
  if (!d) return "—";
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

/** Whole days from now until the date (negative = overdue). */
export function daysUntil(iso?: string | null): number | null {
  const d = parseDate(iso);
  if (!d) return null;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - start.getTime()) / 86400000);
}

export function dueLabel(iso?: string | null) {
  const n = daysUntil(iso);
  if (n === null) return "No due date";
  if (n < 0) return `${Math.abs(n)}d overdue`;
  if (n === 0) return "Due today";
  if (n === 1) return "Due tomorrow";
  if (n <= 7) return `Due in ${n} days`;
  return `Due ${formatShort(iso)}`;
}

/** Due label for something that may already be done — "overdue" is only ever
 *  a warning about work still outstanding, so completed work just shows the
 *  plain date (or nothing) instead of a scary "135d overdue". */
export function statusDueLabel(iso: string | null | undefined, completed: boolean) {
  if (completed) return iso ? `Due ${formatShort(iso)}` : "Completed";
  return dueLabel(iso);
}

export function isThisWeek(iso?: string | null) {
  const n = daysUntil(iso);
  return n !== null && n >= 0 && n <= 7;
}

export function relativeTime(ts: number) {
  const diff = Date.now() - ts;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatShort(new Date(ts).toISOString());
}

export function currentTerm(): "Term 1" | "Term 2" | "Term 3" | "Term 4" {
  const m = new Date().getMonth(); // 0-11
  if (m <= 2) return "Term 1";
  if (m <= 5) return "Term 2";
  if (m <= 8) return "Term 3";
  return "Term 4";
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
