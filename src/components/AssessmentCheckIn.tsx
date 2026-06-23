"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, CalendarPlus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useData } from "@/store/data";
import { assessmentsNeedingCheckIn, subjectById } from "@/lib/selectors";

const DONE_KEY = "anchor:checkin:done";

function loadDone(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DONE_KEY) || "[]");
  } catch {
    return [];
  }
}
function markDone(id: string) {
  try {
    const set = new Set(loadDone());
    set.add(id);
    localStorage.setItem(DONE_KEY, JSON.stringify([...set]));
  } catch {}
}

type Item = { id: string; title: string; subject?: string; dueDate?: string };

/**
 * When an assessment was due today (or recently) and isn't marked complete, the
 * next time the app opens we ask: did you finish it, not yet, or get an
 * extension? Each assessment is asked once.
 */
export function AssessmentCheckIn() {
  const getData = useData((s) => s.data);
  const updateAssessment = useData((s) => s.updateAssessment);

  const [queue, setQueue] = useState<Item[]>([]);
  const [i, setI] = useState(0);
  const [mode, setMode] = useState<"ask" | "extend">("ask");
  const [newDate, setNewDate] = useState("");

  useEffect(() => {
    const d = getData();
    const done = new Set(loadDone());
    const q = assessmentsNeedingCheckIn(d)
      .filter((a) => !done.has(a.id))
      .map((a) => ({
        id: a.id,
        title: a.title,
        subject: subjectById(d, a.subjectId)?.name,
        dueDate: a.dueDate,
      }));
    setQueue(q);
    // run once per app open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cur = queue[i];
  if (!cur) return null;

  const advance = () => {
    setMode("ask");
    setNewDate("");
    setI((x) => x + 1);
  };
  const completed = () => {
    updateAssessment(cur.id, { status: "completed", progress: 100 });
    markDone(cur.id);
    advance();
  };
  const notDone = () => {
    updateAssessment(cur.id, { status: "in-progress" });
    markDone(cur.id);
    advance();
  };
  const saveExtension = () => {
    if (!newDate) return;
    updateAssessment(cur.id, { dueDate: newDate });
    markDone(cur.id);
    advance();
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Modal open={!!cur} onClose={advance} title="Quick check-in" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-ink-soft">
          <span className="font-semibold text-ink">{cur.title}</span>
          {cur.subject ? ` · ${cur.subject}` : ""} was due{" "}
          {cur.dueDate ? cur.dueDate : "recently"}. How did it go?
        </p>

        {mode === "ask" ? (
          <div className="grid gap-2">
            <Button variant="primary" onClick={completed}>
              <CheckCircle2 size={16} /> I completed it
            </Button>
            <Button variant="secondary" onClick={notDone}>
              <Clock size={16} /> Not done yet
            </Button>
            <Button variant="ghost" onClick={() => setMode("extend")}>
              <CalendarPlus size={16} /> I got an extension
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block text-[13px] font-medium text-ink-soft">
              New due date
            </label>
            <input
              type="date"
              min={today}
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="h-11 w-full rounded-2xl border border-black/[0.06] bg-white/70 px-4 text-sm text-ink shadow-inset focus:border-anchor/30 focus:outline-none"
            />
            <div className="flex gap-2">
              <Button variant="primary" onClick={saveExtension} disabled={!newDate}>
                Save new date
              </Button>
              <Button variant="ghost" onClick={() => setMode("ask")}>
                Back
              </Button>
            </div>
          </div>
        )}

        {queue.length > 1 && (
          <p className="text-center text-[12px] text-ink-faint">
            {i + 1} of {queue.length}
          </p>
        )}
      </div>
    </Modal>
  );
}
