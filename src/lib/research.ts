// Server-side web research for the in-app browser.
// Search: Brave Search API when BRAVE_API_KEY is set (reliable, free tier),
// otherwise a keyless DuckDuckGo HTML fallback so it works for every user with
// zero setup. Read: fetch a page and return clean, readable text for the AI.

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0 Safari/537.36";

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
}

async function fetchText(url: string, init?: RequestInit, ms = 9000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      ...init,
      signal: ctrl.signal,
      headers: { "User-Agent": UA, ...(init?.headers || {}) },
      cache: "no-store",
    });
  } finally {
    clearTimeout(t);
  }
}

async function braveSearch(query: string, key: string): Promise<SearchResult[]> {
  const res = await fetchText(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=8`,
    { headers: { Accept: "application/json", "X-Subscription-Token": key } }
  );
  if (!res.ok) throw new Error(`Brave ${res.status}`);
  const data: any = await res.json();
  const results = data?.web?.results;
  if (!Array.isArray(results)) return [];
  return results
    .map((r: any) => ({
      title: stripTags(String(r.title || "")),
      url: String(r.url || ""),
      snippet: stripTags(String(r.description || "")),
    }))
    .filter((r: SearchResult) => r.url && r.title);
}

async function duckDuckGoSearch(query: string): Promise<SearchResult[]> {
  const res = await fetchText("https://html.duckduckgo.com/html/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `q=${encodeURIComponent(query)}`,
  });
  if (!res.ok) throw new Error(`DuckDuckGo ${res.status}`);
  const html = await res.text();
  const out: SearchResult[] = [];
  const re =
    /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && out.length < 8) {
    let href = decodeEntities(m[1]);
    // DDG wraps targets as //duckduckgo.com/l/?uddg=<encoded>&...
    const uddg = href.match(/[?&]uddg=([^&]+)/);
    if (uddg) href = decodeURIComponent(uddg[1]);
    else if (href.startsWith("//")) href = "https:" + href;
    const title = stripTags(m[2]);
    if (!href.startsWith("http") || !title) continue;
    // Skip sponsored / ad links (no real uddg target).
    if (/duckduckgo\.com\/y\.js/.test(href) || /[?&]ad_domain=/.test(href)) continue;
    if (out.some((r) => r.url === href)) continue;
    out.push({ title, url: href, snippet: "" });
  }
  // Attach snippets in document order.
  const snips = [...html.matchAll(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g)].map(
    (s) => stripTags(s[1])
  );
  out.forEach((r, i) => {
    if (snips[i]) r.snippet = snips[i];
  });
  return out;
}

/** Wikipedia search — keyless and reliable from datacenter IPs (works on Vercel
 *  when DuckDuckGo's scrape endpoint blocks server requests). */
async function wikipediaSearch(query: string): Promise<SearchResult[]> {
  const res = await fetchText(
    `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      query
    )}&srlimit=8&format=json`,
    { headers: { Accept: "application/json" } }
  );
  if (!res.ok) throw new Error(`Wikipedia ${res.status}`);
  const data: any = await res.json();
  const hits = data?.query?.search;
  if (!Array.isArray(hits)) return [];
  return hits.map((h: any) => ({
    title: String(h.title || ""),
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(String(h.title || "").replace(/ /g, "_"))}`,
    snippet: stripTags(String(h.snippet || "")),
  }));
}

export async function webSearch(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (!q) return [];
  const key = process.env.BRAVE_API_KEY;
  if (key) {
    try {
      const r = await braveSearch(q, key);
      if (r.length) return r;
    } catch (e) {
      console.error("[research] Brave search failed:", e);
    }
  }
  try {
    const r = await duckDuckGoSearch(q);
    if (r.length) return r;
    console.warn("[research] DuckDuckGo returned no results (likely blocked) — using Wikipedia");
  } catch (e) {
    console.error("[research] DuckDuckGo search failed:", e);
  }
  // Guaranteed keyless fallback so there are always results.
  try {
    return await wikipediaSearch(q);
  } catch (e) {
    console.error("[research] Wikipedia search failed:", e);
    return [];
  }
}

/** Block requests to local / internal addresses (basic SSRF protection). */
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h === "metadata.google.internal")
    return true;
  if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  if (h === "::1" || h.startsWith("fc") || h.startsWith("fd")) return true;
  return false;
}

export interface ReadResult {
  title: string;
  text: string;
  url: string;
}

export async function fetchReadable(rawUrl: string): Promise<ReadResult> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:")
    throw new Error("Only http/https URLs are allowed");
  if (isBlockedHost(url.hostname)) throw new Error("That address isn't allowed");

  const res = await fetchText(url.toString(), { headers: { Accept: "text/html,*/*" } });
  if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("html") && !ct.includes("text") && ct !== "")
    throw new Error("That page isn't readable text");

  // Cap how much we pull so a huge page can't blow memory.
  const raw = (await res.text()).slice(0, 600_000);

  const titleMatch = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? stripTags(titleMatch[1]).slice(0, 200) : url.hostname;

  const body = raw
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<(nav|header|footer|aside|form)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\s*(br|\/p|\/div|\/h[1-6]|\/li|\/tr)\s*>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n- ");
  const text = decodeEntities(body.replace(/<[^>]+>/g, " "))
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 10_000);

  return { title, text, url: url.toString() };
}
