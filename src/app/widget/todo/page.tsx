"use client";

import { useState } from "react";
import { Check, Plus, ListChecks } from "lucide-react";
import { useData } from "@/store/data";
import { useCurrentUser } from "@/store/auth";
import { useMounted } from "@/lib/hooks";
import { personalRemindersActive } from "@/lib/selectors";
import { cn } from "@/lib/cn";

// A compact, chrome-less to-do list designed for the desktop widget window.
export default function TodoWidget() {
  const mounted = useMounted();
  const user = useCurrentUser();
  const d = useData((s) => s.data());
  const addReminder = useData((s) => s.addReminder);
  const completeReminder = useData((s) => s.completeReminder);
  const [title, setTitle] = useState("");

  if (!mounted) return null;

  if (!user) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6 text-center">
        <p className="text-sm text-ink-muted">
          Open Anchor and sign in to use your to-do widget.
        </p>
      </div>
    );
  }

  const todos = personalRemindersActive(d).sort((a, b) => {
    const da = a.dueDate || "9999";
    const db = b.dueDate || "9999";
    return da < db ? -1 : 1;
  });

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    addReminder({ kind: "personal", title: t, priority: "medium", progress: 0 });
    setTitle("");
  };

  return (
    <div className="flex min-h-dvh flex-col p-4">
      <div className="mb-3 flex items-center gap-2">
        <ListChecks size={18} className="text-anchor" />
        <h1 className="text-[15px] font-semibold tracking-tight text-ink">To-do</h1>
        <span className="ml-auto text-[12px] text-ink-faint">{todos.length} open</span>
      </div>

      <form onSubmit={add} className="mb-3 flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task…"
          className="h-10 flex-1 rounded-xl border border-black/[0.06] bg-white/70 px-3 text-[13.5px] text-ink placeholder:text-ink-faint shadow-inset focus:border-anchor/30 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!title.trim()}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-anchor text-white transition-colors hover:bg-anchor-600 disabled:opacity-40"
        >
          <Plus size={18} />
        </button>
      </form>

      <div className="flex-1 space-y-1.5 overflow-y-auto">
        {todos.length === 0 ? (
          <p className="mt-8 text-center text-[13px] text-ink-faint">
            Nothing to do — you&apos;re all caught up.
          </p>
        ) : (
          todos.map((r) => (
            <button
              key={r.id}
              onClick={() => completeReminder(r.id)}
              className="group flex w-full items-center gap-3 rounded-xl bg-white/60 px-3 py-2.5 text-left transition-colors hover:bg-white/90"
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-ink-faint/40 text-white transition-colors group-hover:border-anchor group-hover:bg-anchor"
                )}
              >
                <Check size={12} className="opacity-0 group-hover:opacity-100" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] text-ink">{r.title}</span>
                {r.dueDate && (
                  <span className="text-[11.5px] text-ink-faint">due {r.dueDate}</span>
                )}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
