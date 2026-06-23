"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, RotateCcw, Bell, ChevronRight, Clock, CalendarRange } from "lucide-react";
import { Tag } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/misc";
import { useData } from "@/store/data";
import { academicReminders, subjectById } from "@/lib/selectors";
import { dueLabel, daysUntil } from "@/lib/format";
import type { Assessment } from "@/lib/types";

export default function AcademicRemindersPage() {
  const d = useData((s) => s.data());
  const all = academicReminders(d);
  const active = all.filter((a) => a.status !== "completed");
  const done = all.filter((a) => a.status === "completed");

  const overdue = active.filter((a) => {
    const du = daysUntil(a.dueDate);
    return du !== null && du < 0;
  });
  const thisWeek = active.filter((a) => {
    const du = daysUntil(a.dueDate);
    return du !== null && du >= 0 && du <= 7;
  });
  const later = active.filter((a) => {
    const du = daysUntil(a.dueDate);
    return du === null || du > 7;
  });

  const groups = [
    { key: "overdue", label: "Overdue", tone: "text-red-600", items: overdue },
    { key: "week", label: "This week", tone: "text-amber-600", items: thisWeek },
    { key: "later", label: "Upcoming", tone: "text-ink-soft", items: later },
  ].filter((g) => g.items.length);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 pt-1">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Reminders</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Every assessment, due-sorted. Tap one to open it; tick it off when it&apos;s done.
          </p>
        </div>
        <Link
          href="/personal/reminders"
          className="text-[13px] font-medium text-anchor hover:underline"
        >
          Personal reminders →
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
          {active.length === 0 ? (
            <p className="mt-8 rounded-2xl bg-emerald-500/[0.08] px-5 py-6 text-center text-sm text-emerald-700">
              All caught up — every assessment is complete. 🎉
            </p>
          ) : (
            <div className="mt-6 space-y-7">
              {groups.map((g) => (
                <section key={g.key}>
                  <div className="mb-2 flex items-center gap-2 px-1">
                    <h2
                      className={`text-[12px] font-semibold uppercase tracking-wider ${g.tone}`}
                    >
                      {g.label}
                    </h2>
                    <span className="text-[12px] text-ink-faint">{g.items.length}</span>
                  </div>
                  <div className="space-y-2">
                    {g.items.map((a) => (
                      <ReminderCard key={a.id} a={a} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          {done.length > 0 && (
            <details className="mt-9">
              <summary className="cursor-pointer list-none text-sm font-semibold text-ink-soft hover:text-ink">
                Completed ({done.length})
                <span className="ml-1 text-[12px] font-normal text-ink-faint">
                  — click to show
                </span>
              </summary>
              <p className="mt-1 text-[12px] text-ink-faint">
                Completed assessments are archived, never deleted.
              </p>
              <div className="mt-3 space-y-2">
                {done.map((a) => {
                  const subject = subjectById(d, a.subjectId);
                  return (
                    <div
                      key={a.id}
                      className="flex items-center gap-3 rounded-2xl bg-black/[0.03] px-4 py-3"
                    >
                      <Check size={16} className="shrink-0 text-emerald-600" />
                      <Link
                        href={`/school/subjects/${a.subjectId}/${a.id}`}
                        className="min-w-0 flex-1 truncate text-sm font-medium text-ink-soft line-through decoration-ink-faint/40 hover:text-ink"
                      >
                        {a.title}
                      </Link>
                      {subject && <Tag color={subject.color} label={subject.name} size="sm" />}
                      <ReopenButton id={a.id} />
                    </div>
                  );
                })}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}

function ReminderCard({ a }: { a: Assessment }) {
  const d = useData((s) => s.data());
  const update = useData((s) => s.updateAssessment);
  const subject = subjectById(d, a.subjectId);
  const du = daysUntil(a.dueDate);
  const overdue = du !== null && du < 0;
  const soon = du !== null && du >= 0 && du <= 2;
  const [editingDue, setEditingDue] = useState(false);

  return (
    <div className="flex items-stretch rounded-2xl bg-white/60 ring-1 ring-black/[0.04] transition-all hover:bg-white/90 hover:shadow-soft">
      <Link
        href={`/school/subjects/${a.subjectId}/${a.id}`}
        className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3"
      >
        <span
          className="h-10 w-1.5 shrink-0 rounded-full"
          style={{ background: subject?.color || "#cbd5e1" }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[14px] font-semibold text-ink">{a.title}</span>
            {a.priority === "high" && (
              <span className="shrink-0 rounded-full bg-red-500/10 px-2 py-0.5 text-[10.5px] font-semibold text-red-600">
                High
              </span>
            )}
            {a.kind === "project" && (
              <span className="shrink-0 rounded-full bg-black/[0.05] px-2 py-0.5 text-[10.5px] font-medium text-ink-faint">
                Project
              </span>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px]">
            {subject && (
              <span className="font-medium" style={{ color: subject.color }}>
                {subject.name}
              </span>
            )}
            <span className="text-ink-faint">·</span>
            <span
              className={
                overdue
                  ? "font-medium text-red-600"
                  : soon
                    ? "font-medium text-amber-600"
                    : "text-ink-muted"
              }
            >
              <Clock size={11} className="mr-0.5 inline align-[-1px]" />
              {dueLabel(a.dueDate)}
            </span>
            {a.progress > 0 && (
              <>
                <span className="text-ink-faint">·</span>
                <span className="text-ink-muted">{a.progress}% done</span>
              </>
            )}
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06]">
            <div
              className="h-full rounded-full bg-anchor transition-all"
              style={{ width: `${a.progress}%` }}
            />
          </div>
        </div>
        <ChevronRight size={16} className="shrink-0 self-center text-ink-faint" />
      </Link>
      {editingDue ? (
        <input
          type="date"
          autoFocus
          defaultValue={a.dueDate ?? ""}
          onChange={(e) => update(a.id, { dueDate: e.target.value || undefined })}
          onBlur={() => setEditingDue(false)}
          className="m-2 h-9 shrink-0 rounded-xl border border-black/10 bg-white px-2 text-[12px] text-ink focus:border-anchor/40 focus:outline-none"
          title="Set due date"
        />
      ) : (
        <button
          onClick={() => setEditingDue(true)}
          className="m-2 grid w-10 shrink-0 place-items-center rounded-xl border border-black/10 text-ink-faint transition-colors hover:border-anchor/40 hover:text-anchor"
          aria-label="Edit due date"
          title="Fix the due date"
        >
          <CalendarRange size={16} />
        </button>
      )}
      <button
        onClick={() => update(a.id, { status: "completed", progress: 100 })}
        className="my-2 mr-2 grid w-10 shrink-0 place-items-center rounded-xl border border-black/10 text-ink-faint transition-colors hover:border-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-600"
        aria-label="Mark done"
        title="Mark done"
      >
        <Check size={16} />
      </button>
    </div>
  );
}

function ReopenButton({ id }: { id: string }) {
  const update = useData((s) => s.updateAssessment);
  return (
    <Button size="sm" variant="ghost" onClick={() => update(id, { status: "in-progress" })}>
      <RotateCcw size={14} /> Reopen
    </Button>
  );
}
