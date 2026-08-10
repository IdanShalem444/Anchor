// Client-safe HTML sanitizer — keep free of server-only imports (this is
// bundled into browser pages, unlike canvas.ts which pulls in pdf-parse).

/**
 * Sanitize Canvas description HTML for in-app display: drop scripts/styles/
 * frames, strip event handlers and javascript: URLs, and force links to open
 * in a new tab so navigation never leaves the workspace.
 */
export function sanitizeCanvasHtml(html: string): string {
  let s = html
    // remove dangerous elements *with* their content
    .replace(/<(script|style|iframe|object|embed|form)\b[\s\S]*?<\/\1\s*>/gi, "")
    // and any self-closing/unclosed leftovers of the same
    .replace(/<\/?(script|style|iframe|object|embed|form|link|meta|base)\b[^>]*>/gi, "")
    // inline event handlers: onclick="…" / onload='…' / onerror=…
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    // javascript: URLs in href/src
    .replace(/\s(href|src)\s*=\s*(["']?)\s*javascript:[^"'\s>]*\2/gi, "");
  // links open externally (Electron routes them to the real browser)
  s = s.replace(/<a\b[^>]*>/gi, (tag) =>
    tag
      .replace(/\s(target|rel)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
      .replace(/^<a\b/i, '<a target="_blank" rel="noopener noreferrer"')
  );
  return s.trim();
}
