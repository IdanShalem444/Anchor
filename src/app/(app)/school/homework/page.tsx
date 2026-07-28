"use client";

import { useState } from "react";
import { Plus, Check, Trash2, PencilLine } from "lucide-react";
import { useData } from "@/store/data";
import { activeSubjects } from "@/lib/selectors";
import type { HomeworkItem } from "@/lib/types";
import { cn } from "@/lib/cn";

export default function HomeworkPage() {
  const d = useData((s) => s.data());
  const subjects = activeSubjects(d);
  const addHomework = useData((s) => s.addHomework);

  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState("");

  const items = (d.homework || []).slice();
  const active = items.filter((h) => !h.done);
  const done = items.filter((h) => h.done);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    addHomework({ title: t, subjectId: subjectId || undefined });
    setTitle("");
    setSubjectId("");
  };

  return (
    <div>
      <div className="pt-1">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Homework</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Quick day-to-day tasks — separate from your formal assessments. Add it, tick it off.
        </p>
      </div>

      {/* Add form */}
      <form
        onSubmit={add}
        className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl bg-white/60 p-2 ring-1 ring-black/[0.04]"
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What's the homework? e.g. Maths Ex 7.3 Q1–10"
          className="h-10 min-w-[180px] flex-1 rounded-xl border border-black/[0.06] bg-white/70 px-3 text-[13.5px] text-ink placeholder:text-ink-faint shadow-inset focus:border-anchor/30 focus:outline-none"
        />
        <select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          className="h-10 rounded-xl border border-black/[0.06] bg-white/70 px-2.5 text-[13px] text-ink shadow-inset focus:border-anchor/30 focus:outline-none"
        >
          <option value="">No subject</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={!title.trim()}
          className="flex h-10 items-center gap-1.5 rounded-xl bg-anchor px-4 text-[13.5px] font-medium text-white transition-colors hover:bg-anchor-600 disabled:opacity-40"
        >
          <Plus size={16} /> Add
        </button>
      </form>

      {/* Active list */}
      <div className="mt-6 space-y-2">
        {active.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-black/[0.08] px-6 py-12 text-center">
            <PencilLine className="mx-auto text-ink-faint" size={26} />
            <p className="mt-3 text-sm text-ink-muted">
              No homework right now. Add a task above when something comes up.
            </p>
          </div>
        ) : (
          active.map((h) => <HomeworkRow key={h.id} h={h} />)
        )}
      </div>

      {/* Completed */}
      {done.length > 0 && (
        <details className="mt-8">
          <summary className="cursor-pointer list-none text-sm font-semibold text-ink-soft hover:text-ink">
            Done ({done.length})
            <span className="ml-1 text-[12px] font-normal text-ink-faint">— click to show</span>
          </summary>
          <div className="mt-3 space-y-2">
            {done.map((h) => (
              <HomeworkRow key={h.id} h={h} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function HomeworkRow({ h }: { h: HomeworkItem }) {
  const d = useData((s) => s.data());
  const subject = h.subjectId ? d.subjects.find((s) => s.id === h.subjectId) : undefined;
  const toggle = useData((s) => s.toggleHomework);
  const remove = useData((s) => s.deleteHomework);

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl px-3.5 py-2.5 ring-1 ring-black/[0.04] transition-colors",
        h.done ? "bg-black/[0.03]" : "bg-white/60 hover:bg-white/90"
      )}
    >
      <button
        onClick={() => toggle(h.id)}
        className={cn(
          "grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-colors",
          h.done
            ? "border-emerald-500 bg-emerald-500 text-white"
            : "border-ink-faint/40 text-transparent hover:border-emerald-400"
        )}
        aria-label={h.done ? "Mark not done" : "Mark done"}
      >
        <Check size={13} />
      </button>

      <div className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-[13.5px]",
            h.done ? "text-ink-faint line-through" : "font-medium text-ink"
          )}
        >
          {h.title}
        </span>
        {(subject || h.canvasId != null) && (
          <div className="mt-0.5 flex items-center gap-2 text-[12px]">
            {subject && (
              <span className="font-medium" style={{ color: subject.color }}>
                {subject.name}
              </span>
            )}
            {subject && h.canvasId != null && <span className="text-ink-faint">·</span>}
            {h.canvasId != null && <span className="text-ink-faint">from Canvas</span>}
          </div>
        )}
      </div>

      <button
        onClick={() => remove(h.id)}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-red-500/10 hover:text-red-600"
        aria-label="Delete"
        title="Delete"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}
