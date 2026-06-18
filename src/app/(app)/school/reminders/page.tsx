"use client";

import Link from "next/link";
import { Check, RotateCcw, Bell, ChevronRight } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge, Tag } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/misc";
import { useData } from "@/store/data";
import { academicReminders, subjectById } from "@/lib/selectors";
import { weekdayName, formatShort, dueLabel } from "@/lib/format";
import type { Assessment, Priority, Term } from "@/lib/types";

const priorityTone: Record<Priority, "neutral" | "blue" | "amber" | "red"> = {
  low: "neutral",
  medium: "blue",
  high: "red",
};

export default function AcademicRemindersPage() {
  const d = useData((s) => s.data());
  const all = academicReminders(d);
  const active = all.filter((a) => a.status !== "completed");
  const done = all.filter((a) => a.status === "completed");

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 pt-1">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Reminders</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Your master assessment table — edit inline, tick off when done.
          </p>
        </div>
        <Link href="/personal/reminders" className="text-[13px] font-medium text-anchor hover:underline">
          Personal reminders
        </Link>
      </div>

      {all.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={Bell}
            title="No assessments to track"
            description="Add assessments to your subjects and they'll appear here automatically, due-sorted."
            action={
              <Link href="/school/subjects">
                <Button variant="primary">Go to subjects</Button>
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <GlassCard className="mt-6 overflow-hidden p-0">
            <div className="overflow-x-auto">
              <div className="min-w-[820px]">
                <div className="grid grid-cols-[1.6fr_1fr_0.9fr_0.8fr_0.9fr_0.9fr_1.1fr_0.7fr] gap-3 border-b border-black/[0.06] px-5 py-3 text-[11.5px] font-semibold uppercase tracking-wider text-ink-faint">
                  <span>Assessment</span>
                  <span>Subject</span>
                  <span>Due</span>
                  <span>Day</span>
                  <span>Term</span>
                  <span>Priority</span>
                  <span>Progress</span>
                  <span>Done</span>
                </div>
                {active.map((a) => (
                  <ReminderRow key={a.id} a={a} />
                ))}
                {active.length === 0 && (
                  <p className="px-5 py-8 text-center text-sm text-ink-muted">
                    All caught up — every assessment is complete.
                  </p>
                )}
              </div>
            </div>
          </GlassCard>

          {done.length > 0 && (
            <div className="mt-8">
              <h2 className="text-sm font-semibold text-ink-soft">Completed archive</h2>
              <p className="text-[13px] text-ink-faint">Completed assessments are archived, never deleted.</p>
              <div className="mt-3 space-y-2">
                {done.map((a) => {
                  const subject = subjectById(d, a.subjectId);
                  return (
                    <div
                      key={a.id}
                      className="flex items-center gap-3 rounded-2xl bg-black/[0.03] px-4 py-3"
                    >
                      <Check size={16} className="text-emerald-600" />
                      <span className="flex-1 text-sm font-medium text-ink-soft line-through decoration-ink-faint/40">
                        {a.title}
                      </span>
                      {subject && <Tag color={subject.color} label={subject.name} size="sm" />}
                      <ReopenButton id={a.id} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ReminderRow({ a }: { a: Assessment }) {
  const d = useData((s) => s.data());
  const update = useData((s) => s.updateAssessment);
  const subject = subjectById(d, a.subjectId);

  return (
    <div className="grid grid-cols-[1.6fr_1fr_0.9fr_0.8fr_0.9fr_0.9fr_1.1fr_0.7fr] items-center gap-3 border-b border-black/[0.04] px-5 py-3 text-[13px] transition-colors hover:bg-black/[0.015]">
      <Link
        href={`/school/subjects/${a.subjectId}/${a.id}`}
        className="group flex items-center gap-1.5 font-medium text-ink"
      >
        <span className="truncate">{a.title}</span>
        <ChevronRight size={13} className="shrink-0 text-ink-faint opacity-0 transition-opacity group-hover:opacity-100" />
      </Link>
      <span>{subject && <Tag color={subject.color} label={subject.name} size="sm" />}</span>
      <span className={dueLabel(a.dueDate).includes("overdue") ? "text-red-600" : "text-ink-soft"}>
        {a.dueDate ? formatShort(a.dueDate) : "—"}
      </span>
      <span className="text-ink-muted">{weekdayName(a.dueDate).slice(0, 3)}</span>
      <Select
        value={a.term ?? "Term 1"}
        onChange={(e) => update(a.id, { term: e.target.value as Term })}
        className="h-8 px-2 text-[12px]"
      >
        {["Term 1", "Term 2", "Term 3", "Term 4"].map((t) => (
          <option key={t}>{t}</option>
        ))}
      </Select>
      <Select
        value={a.priority}
        onChange={(e) => update(a.id, { priority: e.target.value as Priority })}
        className="h-8 px-2 text-[12px]"
      >
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </Select>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={a.progress}
          onChange={(e) => {
            const progress = Number(e.target.value);
            update(a.id, { progress, status: progress > 0 ? "in-progress" : "not-started" });
          }}
          className="w-full accent-anchor"
        />
        <span className="w-8 shrink-0 text-right text-[12px] text-ink-muted">{a.progress}%</span>
      </div>
      <button
        onClick={() => update(a.id, { status: "completed", progress: 100 })}
        className="grid h-8 w-8 place-items-center rounded-full border border-black/10 text-ink-faint transition-colors hover:border-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-600"
        aria-label="Mark done"
      >
        <Check size={15} />
      </button>
    </div>
  );
}

function ReopenButton({ id }: { id: string }) {
  const update = useData((s) => s.updateAssessment);
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={() => update(id, { status: "in-progress" })}
    >
      <RotateCcw size={14} /> Reopen
    </Button>
  );
}
