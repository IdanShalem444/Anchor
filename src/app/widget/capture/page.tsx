"use client";

import { useState } from "react";
import { Zap, ListPlus, NotebookPen, Check } from "lucide-react";
import { WidgetFrame } from "@/components/widget/WidgetFrame";
import { useData } from "@/store/data";

export default function CaptureWidget() {
  const addReminder = useData((s) => s.addReminder);
  const addNote = useData((s) => s.addNote);
  const [text, setText] = useState("");
  const [flash, setFlash] = useState<string | null>(null);

  const confirm = (msg: string) => {
    setText("");
    setFlash(msg);
    setTimeout(() => setFlash(null), 1600);
  };

  const asTodo = () => {
    const t = text.trim();
    if (!t) return;
    addReminder({ kind: "personal", title: t, priority: "medium", progress: 0 });
    confirm("Added to your to-do list");
  };
  const asNote = () => {
    const t = text.trim();
    if (!t) return;
    addNote({ title: t.slice(0, 80), body: t, kind: "quick", tags: ["quick capture"] });
    confirm("Saved to notes");
  };

  return (
    <WidgetFrame icon={Zap} title="Quick capture">
      <div className="flex h-full flex-col gap-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
          placeholder="Jot anything — a task, an idea, a reminder…"
          className="min-h-[120px] flex-1 resize-none rounded-2xl border border-black/[0.06] bg-white/70 px-3.5 py-3 text-[14px] leading-relaxed text-ink placeholder:text-ink-faint shadow-inset focus:border-anchor/30 focus:outline-none"
        />
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={asTodo}
            disabled={!text.trim()}
            className="flex items-center justify-center gap-2 rounded-xl bg-anchor px-3 py-2.5 text-[13.5px] font-medium text-white transition-colors hover:bg-anchor-600 disabled:opacity-40"
          >
            <ListPlus size={16} /> To-do
          </button>
          <button
            onClick={asNote}
            disabled={!text.trim()}
            className="flex items-center justify-center gap-2 rounded-xl bg-black/[0.05] px-3 py-2.5 text-[13.5px] font-medium text-ink transition-colors hover:bg-black/[0.08] disabled:opacity-40"
          >
            <NotebookPen size={16} /> Note
          </button>
        </div>
        {flash && (
          <p className="flex items-center justify-center gap-1.5 text-[12.5px] font-medium text-emerald-600">
            <Check size={14} /> {flash}
          </p>
        )}
      </div>
    </WidgetFrame>
  );
}
