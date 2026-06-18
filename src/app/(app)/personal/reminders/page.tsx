"use client";

import { useEffect, useState } from "react";
import { Plus, Bell, Check, Trash2, RotateCcw, CalendarClock } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, SegmentedControl } from "@/components/ui/misc";
import { useData } from "@/store/data";
import { useQueryParam } from "@/lib/hooks";
import { formatShort, dueLabel, daysUntil, weekdayName, parseDate } from "@/lib/format";
import type { Priority, Reminder } from "@/lib/types";
import { cn } from "@/lib/cn";

const pTone: Record<Priority, "neutral" | "blue" | "red"> = {
  low: "neutral",
  medium: "blue",
  high: "red",
};

export default function PersonalRemindersPage() {
  const d = useData((s) => s.data());
  const add = useData((s) => s.addReminder);
  const [view, setView] = useState<"list" | "calendar" | "timeline">("list");
  const [open, setOpen] = useState(false);
  const newFlag = useQueryParam("new");

  useEffect(() => {
    if (newFlag === "1") setOpen(true);
  }, [newFlag]);

  const reminders = d.reminders.filter((r) => r.kind !== "academic");
  const scheduledNotes = d.notes.filter((n) => !n.deletedAt && n.kind === "scheduled" && n.scheduledFor);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Reminders</h1>
          <p className="mt-1 text-sm text-ink-muted">Personal reminders and scheduled notes — they surface on your dashboard.</p>
        </div>
        <Button variant="primary" onClick={() => setOpen(true)}>
          <Plus size={16} /> New reminder
        </Button>
      </div>

      <div className="mt-5">
        <SegmentedControl
          options={[
            { value: "list", label: "List" },
            { value: "calendar", label: "Calendar" },
            { value: "timeline", label: "Timeline" },
          ]}
          value={view}
          onChange={setView}
        />
      </div>

      <div className="mt-5">
        {view === "list" && <ListView reminders={reminders} scheduledNotes={scheduledNotes} />}
        {view === "calendar" && <CalendarView reminders={reminders} scheduledNotes={scheduledNotes} />}
        {view === "timeline" && <TimelineView reminders={reminders} />}
      </div>

      <NewReminderModal open={open} onClose={() => setOpen(false)} onAdd={add} />
    </div>
  );
}

function ListView({
  reminders,
  scheduledNotes,
}: {
  reminders: Reminder[];
  scheduledNotes: { id: string; title: string; scheduledFor?: string }[];
}) {
  const complete = useData((s) => s.completeReminder);
  const reopen = useData((s) => s.reopenReminder);
  const del = useData((s) => s.deleteReminder);
  const active = reminders.filter((r) => r.status === "active").sort((a, b) => (a.dueDate || "9").localeCompare(b.dueDate || "9"));
  const done = reminders.filter((r) => r.status === "completed");

  if (reminders.length === 0 && scheduledNotes.length === 0) {
    return <EmptyState icon={Bell} title="No reminders yet" description="Add a personal reminder — it'll appear here and on your dashboard." />;
  }

  return (
    <div className="space-y-2.5">
      {active.map((r) => (
        <GlassCard key={r.id} className="flex items-center gap-3 p-4">
          <button
            onClick={() => complete(r.id)}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-black/15 text-transparent transition-colors hover:border-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-600"
          >
            <Check size={14} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{r.title}</p>
            {r.notes && <p className="truncate text-[12.5px] text-ink-muted">{r.notes}</p>}
          </div>
          <Badge tone={pTone[r.priority]}>{r.priority}</Badge>
          <span className={cn("text-[13px]", daysUntil(r.dueDate) !== null && daysUntil(r.dueDate)! < 0 ? "text-red-600" : "text-ink-muted")}>
            {dueLabel(r.dueDate)}
          </span>
          <button onClick={() => del(r.id)} className="text-ink-faint hover:text-red-600">
            <Trash2 size={15} />
          </button>
        </GlassCard>
      ))}

      {scheduledNotes.map((n) => (
        <div key={n.id} className="flex items-center gap-3 rounded-3xl border border-dashed border-black/[0.1] px-4 py-3.5">
          <CalendarClock size={16} className="text-anchor" />
          <span className="flex-1 truncate text-sm text-ink-soft">{n.title || "Scheduled note"}</span>
          <Badge tone="neutral">note</Badge>
          <span className="text-[13px] text-ink-muted">{dueLabel(n.scheduledFor)}</span>
        </div>
      ))}

      {done.length > 0 && (
        <div className="pt-4">
          <p className="mb-2 text-sm font-semibold text-ink-soft">Completed</p>
          {done.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-2xl bg-black/[0.03] px-4 py-2.5">
              <Check size={15} className="text-emerald-600" />
              <span className="flex-1 truncate text-[13px] text-ink-muted line-through">{r.title}</span>
              <button onClick={() => reopen(r.id)} className="text-ink-faint hover:text-ink" title="Reopen">
                <RotateCcw size={14} />
              </button>
              <button onClick={() => del(r.id)} className="text-ink-faint hover:text-red-600">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TimelineView({ reminders }: { reminders: Reminder[] }) {
  const active = reminders.filter((r) => r.status === "active");
  const groups: { label: string; items: Reminder[] }[] = [
    { label: "Overdue", items: [] },
    { label: "Today", items: [] },
    { label: "This week", items: [] },
    { label: "Later", items: [] },
    { label: "No date", items: [] },
  ];
  for (const r of active) {
    const n = daysUntil(r.dueDate);
    if (n === null) groups[4].items.push(r);
    else if (n < 0) groups[0].items.push(r);
    else if (n === 0) groups[1].items.push(r);
    else if (n <= 7) groups[2].items.push(r);
    else groups[3].items.push(r);
  }
  if (active.length === 0)
    return <EmptyState icon={Bell} title="Nothing scheduled" description="Your timeline is clear." />;

  return (
    <div className="space-y-6">
      {groups.filter((g) => g.items.length > 0).map((g) => (
        <div key={g.label}>
          <p className="mb-2 text-sm font-semibold text-ink-soft">{g.label}</p>
          <div className="space-y-2 border-l-2 border-black/[0.06] pl-4">
            {g.items.map((r) => (
              <div key={r.id} className="relative">
                <span className="absolute -left-[21px] top-2 h-2 w-2 rounded-full bg-anchor" />
                <GlassCard className="flex items-center justify-between p-3.5">
                  <span className="text-sm font-medium text-ink">{r.title}</span>
                  <span className="text-[12.5px] text-ink-muted">{formatShort(r.dueDate)}</span>
                </GlassCard>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function CalendarView({
  reminders,
  scheduledNotes,
}: {
  reminders: Reminder[];
  scheduledNotes: { id: string; title: string; scheduledFor?: string }[];
}) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(startDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const items = [
    ...reminders.filter((r) => r.status === "active" && r.dueDate).map((r) => ({ date: r.dueDate!, title: r.title })),
    ...scheduledNotes.filter((n) => n.scheduledFor).map((n) => ({ date: n.scheduledFor!, title: n.title || "Note" })),
  ];

  const monthName = first.toLocaleDateString("en-AU", { month: "long", year: "numeric" });

  return (
    <GlassCard className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-ink">{monthName}</h3>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => { const m = month - 1; if (m < 0) { setMonth(11); setYear(year - 1); } else setMonth(m); }}>
            Prev
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { const m = month + 1; if (m > 11) { setMonth(0); setYear(year + 1); } else setMonth(m); }}>
            Next
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-ink-faint">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="py-1">{d}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const iso = new Date(year, month, day).toISOString().slice(0, 10);
          const dayItems = items.filter((it) => parseDate(it.date)?.toISOString().slice(0, 10) === iso);
          const isToday = iso === now.toISOString().slice(0, 10);
          return (
            <div
              key={i}
              className={cn(
                "min-h-[68px] rounded-xl border p-1.5 text-left",
                isToday ? "border-anchor/40 bg-anchor/[0.05]" : "border-black/[0.05]"
              )}
            >
              <span className={cn("text-[11px]", isToday ? "font-semibold text-anchor" : "text-ink-muted")}>{day}</span>
              <div className="mt-0.5 space-y-0.5">
                {dayItems.slice(0, 2).map((it, j) => (
                  <p key={j} className="truncate rounded bg-anchor/10 px-1 py-0.5 text-[10px] text-anchor-700">
                    {it.title}
                  </p>
                ))}
                {dayItems.length > 2 && <p className="text-[10px] text-ink-faint">+{dayItems.length - 2}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}

function NewReminderModal({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (r: Omit<Reminder, "id" | "createdAt" | "status">) => void;
}) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [notes, setNotes] = useState("");

  function save() {
    if (!title.trim()) return;
    onAdd({
      kind: "personal",
      title: title.trim(),
      dueDate: dueDate || undefined,
      priority,
      progress: 0,
      notes: notes.trim() || undefined,
    });
    setTitle("");
    setDueDate("");
    setNotes("");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="New reminder" size="md">
      <div className="space-y-4">
        <div>
          <Label>What do you need to remember?</Label>
          <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Buy art supplies" onKeyDown={(e) => e.key === "Enter" && save()} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Date</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div>
            <Label>Priority</Label>
            <Select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </Select>
          </div>
        </div>
        <div>
          <Label>Details (optional)</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Extra details…" />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={!title.trim()}>Add reminder</Button>
        </div>
      </div>
    </Modal>
  );
}
