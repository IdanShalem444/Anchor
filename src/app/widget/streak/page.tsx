"use client";

import { Flame } from "lucide-react";
import { WidgetFrame } from "@/components/widget/WidgetFrame";
import { useData } from "@/store/data";
import {
  upcomingAssessments,
  dueThisWeek,
  personalRemindersActive,
} from "@/lib/selectors";

export default function StreakWidget() {
  const d = useData((s) => s.data());
  const streak = d.streak?.count ?? 0;
  const week = dueThisWeek(d).length;
  const upcoming = upcomingAssessments(d).length;
  const todos = personalRemindersActive(d).length;

  const stats = [
    { label: "Due this week", value: week },
    { label: "Upcoming", value: upcoming },
    { label: "Open to-dos", value: todos },
  ];

  return (
    <WidgetFrame icon={Flame} title="Your streak">
      <div className="flex h-full flex-col gap-4">
        <div className="flex flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-orange-500/10 to-transparent py-6">
          <div className="flex items-end gap-1.5">
            <span className="text-5xl font-bold tracking-tight text-anchor">{streak}</span>
            <Flame size={28} className="mb-1.5 text-anchor" />
          </div>
          <p className="mt-1 text-[13px] text-ink-muted">
            day{streak === 1 ? "" : "s"} in a row
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-xl bg-white/60 px-2 py-3 text-center"
            >
              <div className="text-xl font-semibold text-ink">{s.value}</div>
              <div className="mt-0.5 text-[11px] leading-tight text-ink-faint">
                {s.label}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-auto text-center text-[12px] text-ink-faint">
          Open Anchor each day to keep your streak alive.
        </p>
      </div>
    </WidgetFrame>
  );
}
