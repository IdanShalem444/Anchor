"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Globe,
  Loader2,
  ArrowLeft,
  ExternalLink,
  Trash2,
  Sparkles,
  BookmarkCheck,
  Check,
  Monitor,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { GlassCard } from "@/components/ui/GlassCard";
import { Tag } from "@/components/ui/Badge";
import { useData } from "@/store/data";
import { activeSubjects, researchForSubject } from "@/lib/selectors";
import { ai } from "@/lib/ai";
import { cn } from "@/lib/cn";

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}
interface ReadResult {
  title: string;
  text: string;
  url: string;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function ResearchPanel() {
  const d = useData((s) => s.data());
  const subjects = useMemo(() => activeSubjects(d), [d]);
  const capture = d.researchCapture ?? false;

  const setResearchCapture = useData((s) => s.setResearchCapture);
  const addResearchEntry = useData((s) => s.addResearchEntry);
  const clearResearch = useData((s) => s.clearResearch);
  const addNote = useData((s) => s.addNote);

  const [subjectId, setSubjectId] = useState<string>(subjects[0]?.id ?? "");
  const subject = subjects.find((s) => s.id === subjectId) ?? subjects[0];

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [viewing, setViewing] = useState<ReadResult | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  // "live" = embed the real page; "reader" = clean server-extracted text.
  const [viewMode, setViewMode] = useState<"live" | "reader">("live");

  const [summarising, setSummarising] = useState(false);
  const [savedNote, setSavedNote] = useState(false);

  const captured = researchForSubject(d, subject?.id);

  function looksLikeUrl(s: string): boolean {
    return /^https?:\/\//i.test(s) || /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(s);
  }

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (!q || !subject) return;
    // If they typed/pasted a link, open it directly in the reader.
    if (looksLikeUrl(q)) {
      const url = /^https?:\/\//i.test(q) ? q : `https://${q}`;
      await open({ title: url, url, snippet: "" });
      return;
    }
    setSearching(true);
    setError(null);
    setViewing(null);
    try {
      const res = await fetch("/api/research/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setResults(data.results || []);
      if (capture) addResearchEntry({ subjectId: subject.id, kind: "search", query: q });
      if ((data.results || []).length === 0) setError("No results — try different keywords.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function open(r: SearchResult) {
    if (!subject) return;
    setOpening(r.url);
    setError(null);
    try {
      const res = await fetch("/api/research/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: r.url }),
      });
      const data = await res.json().catch(() => ({}));
      const page: ReadResult = {
        title: data.title || r.title,
        text: res.ok ? data.text || "" : "",
        url: data.url || r.url,
      };
      // Show the page either way — Live view still works even if the server
      // couldn't extract readable text for the Reader tab.
      setViewing(page);
      if (capture && page.text)
        addResearchEntry({
          subjectId: subject.id,
          kind: "view",
          url: page.url,
          title: page.title,
          excerpt: page.text.slice(0, 1500),
        });
    } catch {
      setViewing({ title: r.title, text: "", url: r.url });
    } finally {
      setOpening(null);
    }
  }

  async function summarise() {
    if (!subject || captured.length === 0) return;
    setSummarising(true);
    setSavedNote(false);
    try {
      const reply = await ai.chat({
        messages: [
          {
            role: "user",
            content:
              "Summarise my saved research below into clear, well-organised study notes for this subject. " +
              "Use short headings and bullet points, keep only the useful facts, and note anything exam-relevant.",
          },
        ],
        context: {
          subject: { name: subject.name, type: subject.type },
          today: new Date().toISOString().slice(0, 10),
          research: captured
            .slice(0, 15)
            .map((r) => ({ query: r.query, title: r.title, excerpt: r.excerpt })),
        },
      });
      addNote({
        title: `Research notes — ${subject.name}`,
        body: reply,
        kind: "permanent",
        tags: [subject.name, "research"],
      });
      setSavedNote(true);
    } catch {
      setError("Couldn't summarise right now — try again.");
    } finally {
      setSummarising(false);
    }
  }

  if (subjects.length === 0) {
    return (
      <GlassCard className="p-10 text-center">
        <Globe className="mx-auto text-ink-faint" size={28} />
        <p className="mt-3 text-sm text-ink-muted">
          Add or sync a subject first — research is saved per subject.
        </p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-5">
      {/* Controls */}
      <GlassCard className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-[13px] font-medium text-ink-soft">Subject</label>
            <select
              value={subject?.id}
              onChange={(e) => {
                setSubjectId(e.target.value);
                setResults([]);
                setViewing(null);
                setError(null);
              }}
              className="h-10 rounded-xl border border-black/[0.06] bg-white/70 px-3 text-sm text-ink shadow-inset focus:border-anchor/30 focus:outline-none"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setResearchCapture(!capture)}
            className={cn(
              "ml-auto flex items-center gap-2 rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors",
              capture ? "bg-anchor/10 text-anchor" : "bg-black/[0.05] text-ink-soft hover:bg-black/[0.08]"
            )}
            title="When on, your searches and the pages you open are saved for this subject and used by Anchor's AI."
          >
            <span
              className={cn(
                "relative h-4 w-7 rounded-full transition-colors",
                capture ? "bg-anchor" : "bg-ink-faint/40"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all",
                  capture ? "left-3.5" : "left-0.5"
                )}
              />
            </span>
            AI capture {capture ? "on" : "off"}
          </button>
        </div>

        <form onSubmit={search} className="mt-3 flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search, or paste a link to read it…`}
              className="pl-10"
            />
          </div>
          <Button type="submit" variant="primary" disabled={searching || !query.trim()}>
            {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            Search
          </Button>
        </form>

        {capture && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[12.5px] text-ink-muted">
            <BookmarkCheck size={14} className="text-anchor" />
            {captured.length} saved for {subject?.name}
            {captured.length > 0 && (
              <>
                <button
                  onClick={summarise}
                  disabled={summarising}
                  className="inline-flex items-center gap-1.5 rounded-full bg-anchor/10 px-2.5 py-1 font-medium text-anchor transition-colors hover:bg-anchor/15 disabled:opacity-50"
                >
                  {summarising ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : savedNote ? (
                    <Check size={13} />
                  ) : (
                    <Sparkles size={13} />
                  )}
                  {savedNote ? "Saved to Notes" : "Summarise into a note"}
                </button>
                <button
                  onClick={() => {
                    clearResearch(subject!.id);
                    setSavedNote(false);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-ink-soft transition-colors hover:bg-black/[0.05]"
                >
                  <Trash2 size={13} /> Clear
                </button>
              </>
            )}
          </div>
        )}
      </GlassCard>

      {error && (
        <p className="rounded-2xl bg-red-500/[0.07] px-4 py-2.5 text-[13px] text-red-700">{error}</p>
      )}

      {/* Page view — browser-style toolbar + Live / Reader */}
      <AnimatePresence mode="wait">
        {viewing ? (
          <motion.div
            key="page"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <GlassCard className="overflow-hidden">
              {/* toolbar */}
              <div className="flex items-center gap-2 border-b border-black/[0.06] bg-white/50 px-3 py-2.5">
                <button
                  onClick={() => setViewing(null)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-black/[0.06]"
                  title="Back to results"
                >
                  <ArrowLeft size={16} />
                </button>
                <a
                  href={viewing.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-lg bg-black/[0.04] px-3 py-1.5 text-[12.5px] text-ink-soft transition-colors hover:bg-black/[0.06]"
                  title={viewing.url}
                >
                  <Globe size={13} className="shrink-0 text-ink-faint" />
                  <span className="truncate">{viewing.url}</span>
                  <ExternalLink size={12} className="ml-auto shrink-0 text-ink-faint" />
                </a>
                {/* Live / Reader switch */}
                <div className="flex shrink-0 items-center rounded-lg bg-black/[0.05] p-0.5 text-[12px] font-medium">
                  <button
                    onClick={() => setViewMode("live")}
                    className={cn(
                      "flex items-center gap-1 rounded-md px-2.5 py-1 transition-colors",
                      viewMode === "live" ? "bg-white text-ink shadow-soft" : "text-ink-soft"
                    )}
                  >
                    <Monitor size={13} /> Live
                  </button>
                  <button
                    onClick={() => setViewMode("reader")}
                    className={cn(
                      "flex items-center gap-1 rounded-md px-2.5 py-1 transition-colors",
                      viewMode === "reader" ? "bg-white text-ink shadow-soft" : "text-ink-soft"
                    )}
                  >
                    <FileText size={13} /> Reader
                  </button>
                </div>
                {capture && (
                  <span className="hidden shrink-0 items-center gap-1 rounded-full bg-anchor/10 px-2.5 py-1 text-[11.5px] font-medium text-anchor sm:flex">
                    <BookmarkCheck size={12} /> Saved
                  </span>
                )}
              </div>

              {viewMode === "live" ? (
                <div className="relative">
                  <iframe
                    src={viewing.url}
                    title={viewing.title}
                    className="h-[68vh] w-full bg-white"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                  <p className="border-t border-black/[0.06] bg-white/60 px-4 py-1.5 text-center text-[11.5px] text-ink-faint">
                    Page blank? That site blocks embedding — switch to{" "}
                    <button onClick={() => setViewMode("reader")} className="font-medium text-anchor hover:underline">
                      Reader
                    </button>{" "}
                    to read it here.
                  </p>
                </div>
              ) : (
                <div className="p-5 sm:p-6">
                  <h2 className="text-lg font-semibold text-ink">{viewing.title}</h2>
                  <div className="mt-3 max-h-[62vh] overflow-y-auto whitespace-pre-wrap text-[14px] leading-relaxed text-ink-soft">
                    {viewing.text || "No readable text could be extracted from this page."}
                  </div>
                </div>
              )}
            </GlassCard>
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2.5"
          >
            {results.map((r) => (
              <GlassCard
                key={r.url}
                interactive
                onClick={() => open(r)}
                className="p-4"
              >
                <div className="flex items-center gap-2 text-[12px] text-ink-faint">
                  <Globe size={12} /> {hostOf(r.url)}
                  {opening === r.url && <Loader2 size={12} className="ml-1 animate-spin text-anchor" />}
                </div>
                <h3 className="mt-1 text-[15px] font-semibold text-ink">{r.title}</h3>
                {r.snippet && (
                  <p className="mt-1 line-clamp-2 text-[13px] text-ink-muted">{r.snippet}</p>
                )}
              </GlassCard>
            ))}
            {results.length === 0 && !searching && !error && (
              <div className="rounded-3xl border border-dashed border-black/[0.08] px-6 py-12 text-center">
                <Globe className="mx-auto text-ink-faint" size={26} />
                <p className="mt-3 text-sm text-ink-muted">
                  Search for {subject?.name}, or paste any link to read it here.
                  {capture ? " Pages you open are saved and " : " Turn on AI capture and they'll be "}
                  used when Anchor generates your notes & flashcards.
                </p>
                <p className="mx-auto mt-2 max-w-md text-[12px] text-ink-faint">
                  Tip: add a free Brave Search API key in Vercel for full web search —
                  without it, search uses Wikipedia (you can still open any link directly).
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
