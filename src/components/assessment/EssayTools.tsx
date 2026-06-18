"use client";

import { useMemo, useState } from "react";
import {
  Plus,
  Quote as QuoteIcon,
  BookOpen,
  Trash2,
  Pencil,
  Search,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, SegmentedControl, ProgressBar } from "@/components/ui/misc";
import { useData } from "@/store/data";
import type { Assessment, Subject } from "@/lib/types";
import { cn } from "@/lib/cn";

const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, "");

export function EssayTools({
  subject,
  assessment,
}: {
  subject: Subject;
  assessment?: Assessment;
}) {
  const [tab, setTab] = useState<"memoriser" | "quotes">("memoriser");
  return (
    <div>
      <SegmentedControl
        className="mb-5"
        options={[
          { value: "memoriser", label: "Essay memoriser" },
          { value: "quotes", label: "Quote bank" },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "memoriser" ? (
        <Memoriser subject={subject} assessment={assessment} />
      ) : (
        <QuoteBank subject={subject} assessment={assessment} />
      )}
    </div>
  );
}

// ── Essay memoriser ─────────────────────────────────────────────

function Memoriser({
  subject,
  assessment,
}: {
  subject: Subject;
  assessment?: Assessment;
}) {
  const d = useData((s) => s.data());
  const addEssay = useData((s) => s.addEssay);
  const updateEssay = useData((s) => s.updateEssay);
  const deleteEssay = useData((s) => s.deleteEssay);
  const essays = d.essays.filter((e) => e.subjectId === subject.id);

  const [activeId, setActiveId] = useState<string | null>(essays[0]?.id ?? null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mode, setMode] = useState<"read" | "practise">("read");

  const active = essays.find((e) => e.id === activeId) ?? essays[0];

  function openNew() {
    setEditId(null);
    setTitle("");
    setContent("");
    setEditorOpen(true);
  }
  function openEdit() {
    if (!active) return;
    setEditId(active.id);
    setTitle(active.title);
    setContent(active.content);
    setEditorOpen(true);
  }
  function save() {
    if (!content.trim()) return;
    if (editId) {
      updateEssay(editId, { title: title.trim() || "Untitled essay", content });
    } else {
      const e = addEssay({
        subjectId: subject.id,
        assessmentId: assessment?.id,
        title: title.trim() || "Untitled essay",
        content,
      });
      setActiveId(e.id);
    }
    setEditorOpen(false);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {essays.map((e) => (
          <button
            key={e.id}
            onClick={() => setActiveId(e.id)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors",
              active?.id === e.id ? "bg-anchor/10 text-anchor" : "bg-black/[0.04] text-ink-soft hover:bg-black/[0.07]"
            )}
          >
            {e.title}
          </button>
        ))}
        <Button size="sm" variant="secondary" onClick={openNew}>
          <Plus size={14} /> Add essay
        </Button>
      </div>

      {!active ? (
        <EmptyState
          icon={BookOpen}
          title="Add a practice essay"
          description="Paste a practice essay or model response, then read it, cover it, and write it from memory."
          action={
            <Button variant="primary" onClick={openNew}>
              <Plus size={16} /> New essay
            </Button>
          }
        />
      ) : (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <SegmentedControl
              options={[
                { value: "read", label: "Read" },
                { value: "practise", label: "Cover · Write · Check" },
              ]}
              value={mode}
              onChange={setMode}
            />
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={openEdit}>
                <Pencil size={14} /> Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-600 hover:bg-red-500/10"
                onClick={() => {
                  if (confirm(`Delete "${active.title}"?`)) {
                    deleteEssay(active.id);
                    setActiveId(null);
                  }
                }}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          </div>

          {mode === "read" ? (
            <div className="rounded-3xl border border-black/[0.06] bg-white/60 p-6 text-[15px] leading-[1.9] text-ink-soft">
              {active.content.split("\n").map((p, i) => (
                <p key={i} className="mb-3">
                  {p}
                </p>
              ))}
            </div>
          ) : (
            <PractiseOverlay key={active.id} text={active.content} />
          )}
        </div>
      )}

      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editId ? "Edit essay" : "Add essay"}
        size="xl"
      >
        <div className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Hamlet — appearance vs reality" />
          </div>
          <div>
            <Label>Essay text</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste your practice essay here…"
              className="min-h-[260px]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={save} disabled={!content.trim()}>
              Save essay
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/** Cover-write-check: essay words reveal (bold) as you correctly type them. */
function PractiseOverlay({ text }: { text: string }) {
  const [typed, setTyped] = useState("");
  const [reveal, setReveal] = useState(false);

  const tokens = useMemo(() => text.split(/(\s+)/), [text]);
  const typedWords = useMemo(
    () => typed.trim().split(/\s+/).filter(Boolean),
    [typed]
  );

  // map each non-space token to its word index
  let wordIdx = -1;
  const wordTokens = tokens.map((t) => {
    const isWord = /\S/.test(t);
    if (isWord) wordIdx += 1;
    return { t, isWord, idx: isWord ? wordIdx : -1 };
  });
  const totalWords = wordIdx + 1;
  let correctCount = 0;
  for (let i = 0; i < typedWords.length && i < totalWords; i++) {
    const orig = wordTokens.find((w) => w.idx === i);
    if (orig && norm(orig.t) === norm(typedWords[i])) correctCount++;
  }
  const accuracy = typedWords.length
    ? Math.round((correctCount / Math.min(typedWords.length, totalWords)) * 100)
    : 0;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[13px] font-medium text-ink-soft">The essay</span>
          <button
            onClick={() => setReveal((r) => !r)}
            className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-muted hover:text-ink"
          >
            {reveal ? <EyeOff size={14} /> : <Eye size={14} />}
            {reveal ? "Cover" : "Peek"}
          </button>
        </div>
        <div className="min-h-[260px] rounded-3xl border border-black/[0.06] bg-white/60 p-6 text-[15px] leading-[1.9]">
          {wordTokens.map((w, i) => {
            if (!w.isWord) return <span key={i}>{w.t}</span>;
            const typedW = typedWords[w.idx];
            const done = w.idx < typedWords.length;
            const correct = typedW && norm(typedW) === norm(w.t);
            return (
              <span
                key={i}
                className={cn(
                  "rounded transition-all",
                  done && correct && "font-semibold text-ink",
                  done && !correct && "bg-red-500/15 text-red-600",
                  !done && (reveal ? "text-ink-faint" : "bg-ink/10 text-transparent")
                )}
              >
                {w.t}
              </span>
            );
          })}
        </div>
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[13px] font-medium text-ink-soft">Write from memory</span>
          <span className="text-[12.5px] text-ink-muted">
            {correctCount}/{totalWords} · {accuracy}%
          </span>
        </div>
        <ProgressBar value={(correctCount / Math.max(1, totalWords)) * 100} className="mb-2" />
        <Textarea
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="Start typing the essay from memory — correct words turn bold, mistakes are highlighted."
          className="min-h-[230px] leading-[1.9]"
        />
        {typedWords.length >= totalWords && totalWords > 0 && (
          <div className="mt-2 rounded-2xl bg-emerald-500/[0.08] px-4 py-2.5 text-[13px] text-emerald-700">
            Complete — {accuracy}% accurate. {accuracy === 100 ? "Word perfect." : "Cover and try again to lock it in."}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Quote bank ──────────────────────────────────────────────────

function QuoteBank({
  subject,
  assessment,
}: {
  subject: Subject;
  assessment?: Assessment;
}) {
  const d = useData((s) => s.data());
  const addQuote = useData((s) => s.addQuote);
  const deleteQuote = useData((s) => s.deleteQuote);
  const quotes = d.quotes.filter((q) => q.subjectId === subject.id);

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [technique, setTechnique] = useState("");
  const [theme, setTheme] = useState("");
  const [source, setSource] = useState("");

  const filtered = quotes.filter((quote) => {
    const term = q.toLowerCase();
    return (
      !term ||
      `${quote.text} ${quote.technique} ${quote.theme} ${quote.source}`
        .toLowerCase()
        .includes(term)
    );
  });

  function add() {
    if (!text.trim()) return;
    addQuote({
      subjectId: subject.id,
      assessmentId: assessment?.id,
      text: text.trim(),
      technique: technique.trim() || undefined,
      theme: theme.trim() || undefined,
      source: source.trim() || undefined,
    });
    setText("");
    setTechnique("");
    setTheme("");
    setSource("");
    setOpen(false);
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search quotes, techniques, themes…"
            className="pl-10"
          />
        </div>
        <Button variant="primary" onClick={() => setOpen(true)}>
          <Plus size={16} /> Add quote
        </Button>
      </div>

      {open && (
        <div className="mb-4 space-y-3 rounded-3xl border border-black/[0.06] bg-white/70 p-5">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Quote text…" className="min-h-[70px]" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Input value={technique} onChange={(e) => setTechnique(e.target.value)} placeholder="Technique" />
            <Input value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="Theme" />
            <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Source / act / page" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={add} disabled={!text.trim()}>Save quote</Button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={QuoteIcon}
          title={q ? "No matching quotes" : "Build your quote bank"}
          description="Store quotes with their technique, theme and source — everything stays searchable."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((quote) => (
            <div key={quote.id} className="rounded-3xl border border-black/[0.06] bg-white/60 p-5">
              <div className="flex items-start gap-3">
                <QuoteIcon size={18} className="mt-1 shrink-0 text-anchor" />
                <p className="flex-1 text-[15px] italic leading-relaxed text-ink">“{quote.text}”</p>
                <button
                  onClick={() => deleteQuote(quote.id)}
                  className="text-ink-faint transition-colors hover:text-red-600"
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5 pl-7">
                {quote.technique && <Badge tone="blue">{quote.technique}</Badge>}
                {quote.theme && <Badge tone="anchor">{quote.theme}</Badge>}
                {quote.source && <Badge tone="neutral">{quote.source}</Badge>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
