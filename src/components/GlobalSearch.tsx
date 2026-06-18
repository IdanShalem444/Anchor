"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Search,
  BookOpen,
  FileText,
  StickyNote,
  Bell,
  MessageSquare,
  FolderKanban,
  CornerDownLeft,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useData } from "@/store/data";
import { Dot } from "@/components/ui/Badge";

type Hit = {
  id: string;
  label: string;
  sub: string;
  icon: typeof Search;
  href: string;
  color?: string;
};

export function GlobalSearch({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const data = useData((s) => (open ? s.data() : null));

  const hits = useMemo<Hit[]>(() => {
    if (!data) return [];
    const term = q.trim().toLowerCase();
    const out: Hit[] = [];
    const subjectsById = Object.fromEntries(data.subjects.map((s) => [s.id, s]));

    for (const s of data.subjects.filter((s) => !s.deletedAt)) {
      if (!term || s.name.toLowerCase().includes(term))
        out.push({
          id: s.id,
          label: s.name,
          sub: "Subject",
          icon: BookOpen,
          href: `/school/subjects/${s.id}`,
          color: s.color,
        });
    }
    for (const a of data.assessments.filter((a) => !a.deletedAt)) {
      const hay = `${a.title} ${a.description ?? ""}`.toLowerCase();
      if (!term || hay.includes(term))
        out.push({
          id: a.id,
          label: a.title,
          sub: `Assessment · ${subjectsById[a.subjectId]?.name ?? ""}`,
          icon: FileText,
          href: `/school/subjects/${a.subjectId}/${a.id}`,
          color: a.color,
        });
    }
    for (const n of data.notes.filter((n) => !n.deletedAt)) {
      const hay = `${n.title} ${n.body}`.toLowerCase();
      if (!term || hay.includes(term))
        out.push({
          id: n.id,
          label: n.title || "Untitled note",
          sub: "Note",
          icon: StickyNote,
          href: `/personal/notes?id=${n.id}`,
        });
    }
    for (const r of data.reminders) {
      if (!term || r.title.toLowerCase().includes(term))
        out.push({
          id: r.id,
          label: r.title,
          sub: "Reminder",
          icon: Bell,
          href: "/personal/reminders",
        });
    }
    for (const c of data.chats) {
      if (!term || c.title.toLowerCase().includes(term))
        out.push({
          id: c.id,
          label: c.title,
          sub: "Chat",
          icon: MessageSquare,
          href: `/chat?c=${c.id}`,
        });
    }
    for (const p of data.projects.filter((p) => !p.deletedAt)) {
      if (!term || p.name.toLowerCase().includes(term))
        out.push({
          id: p.id,
          label: p.name,
          sub: "Project",
          icon: FolderKanban,
          href: `/personal/projects/${p.id}`,
          color: p.color,
        });
    }
    return out.slice(0, 24);
  }, [data, q]);

  function go(href: string) {
    onClose();
    setQ("");
    router.push(href);
  }

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <div className="-mt-2">
        <div className="flex items-center gap-3 border-b border-black/[0.06] pb-3">
          <Search className="text-ink-muted" size={20} />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search subjects, assessments, notes, reminders, chats…"
            className="w-full bg-transparent text-[15px] text-ink placeholder:text-ink-faint focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && hits[0]) go(hits[0].href);
            }}
          />
        </div>
        <div className="mt-3 max-h-[52vh] overflow-y-auto no-scrollbar">
          {hits.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-muted">
              {q ? "Nothing matched your search." : "Start typing to search across everything in Anchor."}
            </p>
          ) : (
            <div className="space-y-1">
              {hits.map((h, i) => (
                <motion.button
                  key={h.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.2) }}
                  onClick={() => go(h.href)}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-black/[0.04]"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-black/[0.04]">
                    <h.icon size={16} className="text-ink-soft" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">
                      {h.label}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-ink-muted">
                      {h.color && <Dot color={h.color} className="h-1.5 w-1.5" />}
                      {h.sub}
                    </span>
                  </span>
                  <CornerDownLeft size={14} className="text-ink-faint" />
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
