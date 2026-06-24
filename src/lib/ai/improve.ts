// Shared prompt + output cleanup for the "Improve with AI" note fixer.

export const IMPROVE_SYS =
  "You are an expert study-note editor. Rewrite the student's notes to be clearer and better " +
  "organised, PRESERVING ALL of their points and meaning — never drop a detail and never " +
  "invent new facts; only fix grammar/spelling, tighten the wording, and structure it well.\n" +
  "Choose the format that fits the content:\n" +
  "- A short single idea → one clean sentence or short <p>, no heading.\n" +
  "- Several related points, a list, steps or examples → a brief lead-in then a <ul> with one " +
  "<li> per point. Keep each point separate; do NOT merge them into a paragraph.\n" +
  "- Clearly distinct topics → a short <h3> for each, with bullets or a short paragraph under it.\n" +
  "Keep it scannable and natural — never a wall of text, never over-fragmented. Bold key terms " +
  "with <strong>.\n" +
  "Respond with ONLY clean minimal HTML using <h3>, <p>, <ul>, <li>, <strong>, <em>, <br>. " +
  "No markdown, no code fences, no commentary.";

/**
 * Strip fences / reasoning preamble, keep just the HTML, and collapse inter-tag
 * whitespace so it renders tidily. Returns "" if the model didn't actually
 * produce HTML (e.g. it dumped chain-of-thought) — the caller treats that as a
 * failure and falls back.
 */
export function sanitizeImprovedHtml(raw: string): string {
  let s = (raw || "").trim();
  s = s.replace(/```(?:html)?/gi, "").trim();
  s = s.replace(/<think>[\s\S]*?<\/think>/gi, "").trim(); // drop reasoning blocks
  const first = s.search(/<(h1|h2|h3|p|ul|ol|li|strong|em|br)\b/i);
  if (first < 0) return ""; // no HTML at all → signal failure
  s = s.slice(first);
  const last = s.lastIndexOf(">");
  if (last >= 0) s = s.slice(0, last + 1); // drop any trailing prose
  s = s.replace(/>\s+</g, "><").trim();
  return s;
}
