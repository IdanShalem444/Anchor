"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  StickyNote,
  Trash2,
  RotateCcw,
  Pin,
  CalendarClock,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, SegmentedControl } from "@/components/ui/misc";
import { useData } from "@/store/data";
import { useQueryParam } from "@/lib/hooks";
import { relativeTime, formatShort } from "@/lib/format";
import type { Note, NoteKind } from "@/lib/types";
import { cn } from "@/lib/cn";

export default function NotesPage() {
  const d = useData((s) => s.data());
  const addNote = useData((s) => s.addNote);
  const restoreNote = useData((s) => s.restoreNote);
  const deleteForever = useData((s) => s.deleteNoteForever);

  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const newFlag = useQueryParam("new");
  const idParam = useQueryParam("id");

  const active = useMemo(
    () =>
      d.notes
        .filter((n) => !n.deletedAt)
        .filter((n) =>
          query
            ? `${n.title} ${n.body} ${n.tags.join(" ")}`.toLowerCase().includes(query.toLowerCase())
            : true
        )
        .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.updatedAt - a.updatedAt),
    [d.notes, query]
  );
  const trashed = d.notes.filter((n) => n.deletedAt);

  function create() {
    const n = addNote({ title: "", body: "", kind: "quick", pinned: false });
    setSelectedId(n.id);
    setShowTrash(false);
  }

  useEffect(() => {
    if (newFlag === "1") create();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newFlag]);
  useEffect(() => {
    if (idParam) setSelectedId(idParam);
  }, [idParam]);

  const selected = d.notes.find((n) => n.id === selectedId && !n.deletedAt);

  return (
    <div>
      <div className="flex items-center justify-between pt-1">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Notes</h1>
        <Button variant="primary" onClick={create}>
          <Plus size={16} /> New note
        </Button>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* list */}
        <GlassCard className="flex max-h-[640px] flex-col p-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notes…"
              className="h-10 pl-9"
            />
          </div>
          <div className="mt-2 flex gap-1.5">
            <button
              onClick={() => setShowTrash(false)}
              className={cn(
                "flex-1 rounded-xl px-2 py-1.5 text-[12.5px] font-medium transition-colors",
                !showTrash ? "bg-white/70 text-ink shadow-soft" : "text-ink-muted hover:bg-white/40"
              )}
            >
              Notes ({active.length})
            </button>
            <button
              onClick={() => setShowTrash(true)}
              className={cn(
                "flex-1 rounded-xl px-2 py-1.5 text-[12.5px] font-medium transition-colors",
                showTrash ? "bg-white/70 text-ink shadow-soft" : "text-ink-muted hover:bg-white/40"
              )}
            >
              Trash ({trashed.length})
            </button>
          </div>

          <div className="mt-2 flex-1 space-y-1 overflow-y-auto no-scrollbar">
            {!showTrash ? (
              active.length === 0 ? (
                <p className="px-2 py-8 text-center text-[13px] text-ink-muted">No notes yet.</p>
              ) : (
                active.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => setSelectedId(n.id)}
                    className={cn(
                      "w-full rounded-2xl px-3 py-2.5 text-left transition-colors",
                      selectedId === n.id ? "bg-white/70 shadow-soft" : "hover:bg-white/50"
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      {n.pinned && <Pin size={11} className="text-anchor" />}
                      <span className="truncate text-[13.5px] font-medium text-ink">
                        {n.title || "Untitled"}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[12px] text-ink-muted">
                      {n.body || "No content"}
                    </p>
                  </button>
                ))
              )
            ) : trashed.length === 0 ? (
              <p className="px-2 py-8 text-center text-[13px] text-ink-muted">Trash is empty.</p>
            ) : (
              trashed.map((n) => (
                <div key={n.id} className="flex items-center gap-2 rounded-2xl px-3 py-2.5">
                  <span className="flex-1 truncate text-[13px] text-ink-soft">
                    {n.title || "Untitled"}
                  </span>
                  <button onClick={() => restoreNote(n.id)} className="text-ink-faint hover:text-ink" title="Restore">
                    <RotateCcw size={14} />
                  </button>
                  <button
                    onClick={() => deleteForever(n.id)}
                    className="text-ink-faint hover:text-red-600"
                    title="Delete forever"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </GlassCard>

        {/* editor */}
        <GlassCard className="min-h-[640px] p-6">
          {selected ? (
            <NoteEditor key={selected.id} note={selected} onTrash={() => setSelectedId(null)} />
          ) : (
            <div className="grid h-full place-items-center">
              <EmptyState
                icon={StickyNote}
                title="Select or create a note"
                description="Quick thoughts, permanent references, or scheduled reminders — all saved automatically."
                action={
                  <Button variant="primary" onClick={create}>
                    <Plus size={16} /> New note
                  </Button>
                }
              />
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}

function NoteEditor({ note, onTrash }: { note: Note; onTrash: () => void }) {
  const update = useData((s) => s.updateNote);
  const trash = useData((s) => s.trashNote);
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [tags, setTags] = useState(note.tags.join(", "));

  const setKind = (kind: NoteKind) => update(note.id, { kind });

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2">
        <SegmentedControl
          options={[
            { value: "quick", label: "Quick" },
            { value: "permanent", label: "Permanent" },
            { value: "scheduled", label: "Scheduled" },
          ]}
          value={note.kind}
          onChange={setKind}
        />
        <div className="flex items-center gap-1">
          <button
            onClick={() => update(note.id, { pinned: !note.pinned })}
            className={cn(
              "grid h-9 w-9 place-items-center rounded-xl transition-colors",
              note.pinned ? "text-anchor" : "text-ink-faint hover:bg-black/[0.04]"
            )}
            title="Pin"
          >
            <Pin size={16} />
          </button>
          <button
            onClick={() => {
              trash(note.id);
              onTrash();
            }}
            className="grid h-9 w-9 place-items-center rounded-xl text-ink-faint transition-colors hover:bg-red-500/10 hover:text-red-600"
            title="Move to trash"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {note.kind === "scheduled" && (
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-anchor/[0.06] px-3 py-2">
          <CalendarClock size={15} className="text-anchor" />
          <span className="text-[13px] text-ink-soft">Remind me on</span>
          <input
            type="date"
            value={note.scheduledFor ?? ""}
            onChange={(e) => update(note.id, { scheduledFor: e.target.value || undefined })}
            className="ml-auto rounded-lg border border-black/10 bg-white/70 px-2 py-1 text-[13px] focus:outline-none"
          />
        </div>
      )}

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => update(note.id, { title })}
        placeholder="Title"
        className="mt-4 w-full bg-transparent text-2xl font-semibold tracking-tight text-ink placeholder:text-ink-faint focus:outline-none"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onBlur={() => update(note.id, { body })}
        placeholder="Start writing…"
        className="mt-3 min-h-[300px] flex-1 resize-none bg-transparent text-[15px] leading-relaxed text-ink-soft placeholder:text-ink-faint focus:outline-none"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-black/[0.06] pt-3">
        <Input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          onBlur={() =>
            update(note.id, {
              tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
            })
          }
          placeholder="Tags, comma separated"
          className="h-9 max-w-xs text-[13px]"
        />
        <span className="ml-auto text-[12px] text-ink-faint">
          Saved {relativeTime(note.updatedAt)}
          {note.kind === "scheduled" && note.scheduledFor && ` · ${formatShort(note.scheduledFor)}`}
        </span>
      </div>
    </div>
  );
}
