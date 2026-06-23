"use client";

import { CalendarClock } from "lucide-react";
import { WidgetFrame } from "@/components/widget/WidgetFrame";
import { useData } from "@/store/data";
import { upcomingAssessments, subjectById } from "@/lib/selectors";
import { daysUntil } from "@/lib/format";
import { cn } from "@/lib/cn";

export default function NextWidget() {
  const d = useData((s) => s.data());
  const items = upcomingAssessments(d).slice(0, 7);

  return (
    <WidgetFrame
      icon={CalendarClock}
      title="Next up"
      right={<span className="text-[12px] text-ink-faint">{items.length}</span>}
    >
      {items.length === 0 ? (
        <p className="mt-8 text-center text-[13px] text-ink-faint">
          Nothing due — you&apos;re ahead.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((a) => {
            const subj = subjectById(d, a.subjectId);
            const du = daysUntil(a.dueDate);
            const label =
              du === 0 ? "Today" : du === 1 ? "Tomorrow" : du !== null ? `${du} days` : "";
            return (
              <div key={a.id} className="rounded-xl bg-white/60 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: subj?.color || "#9ca3af" }}
                  />
                  <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink">
                    {a.title}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 text-[12px] font-medium",
                      du !== null && du <= 1 ? "text-anchor" : "text-ink-faint"
                    )}
                  >
                    {label}
                  </span>
                </div>
                {subj && (
                  <p className="ml-[18px] mt-0.5 truncate text-[11.5px] text-ink-faint">
                    {subj.name} · {a.dueDate}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </WidgetFrame>
  );
}
