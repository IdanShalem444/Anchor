"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, CalendarPlus, Upload, FileQuestion } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useData } from "@/store/data";
import {
  assessmentsNeedingCheckIn,
  assessmentsNeedingNotification,
  subjectById,
} from "@/lib/selectors";
import { dueLabel } from "@/lib/format";

const DONE_KEY = "anchor:checkin:done";
const NOTIF_KEY = "anchor:notif-prompt:seen";

function load(key: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}
function mark(key: string, id: string) {
  try {
    const set = new Set(load(key));
    set.add(id);
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch {}
}

type Item =
  | { type: "checkin"; id: string; title: string; subject?: string; dueDate?: string }
  | {
      type: "notification";
      id: string;
      subjectId: string;
      title: string;
      subject?: string;
      dueDate?: string;
    };

/**
 * On app open, surface two kinds of nudge (one assessment at a time):
 * - check-in: something was due today/recently and isn't marked done.
 * - missing notification: a Canvas assessment due in ~1–3 weeks has no details,
 *   so we ask the student to add the notification.
 */
export function AssessmentCheckIn() {
  const getData = useData((s) => s.data);
  const updateAssessment = useData((s) => s.updateAssessment);
  const router = useRouter();

  const [queue, setQueue] = useState<Item[]>([]);
  const [i, setI] = useState(0);
  const [mode, setMode] = useState<"ask" | "extend">("ask");
  const [newDate, setNewDate] = useState("");

  useEffect(() => {
    const d = getData();
    const doneSet = new Set(load(DONE_KEY));
    const notifSet = new Set(load(NOTIF_KEY));

    const checkins: Item[] = assessmentsNeedingCheckIn(d)
      .filter((a) => !doneSet.has(a.id))
      .map((a) => ({
        type: "checkin",
        id: a.id,
        title: a.title,
        subject: subjectById(d, a.subjectId)?.name,
        dueDate: a.dueDate,
      }));

    const notifs: Item[] = assessmentsNeedingNotification(d)
      .filter((a) => !notifSet.has(a.id))
      .map((a) => ({
        type: "notification",
        id: a.id,
        subjectId: a.subjectId,
        title: a.title,
        subject: subjectById(d, a.subjectId)?.name,
        dueDate: a.dueDate,
      }));

    setQueue([...checkins, ...notifs]);
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
  const today = new Date().toISOString().slice(0, 10);

  // ── missing-notification prompt ──────────────────────────────
  if (cur.type === "notification") {
    const skip = () => {
      mark(NOTIF_KEY, cur.id);
      advance();
    };
    const addNow = () => {
      mark(NOTIF_KEY, cur.id);
      router.push(`/school/subjects/${cur.subjectId}/${cur.id}`);
      advance();
    };
    return (
      <Modal open onClose={skip} title="Add this assessment's details?" size="sm">
        <div className="space-y-4">
          <p className="flex items-start gap-2 text-sm text-ink-soft">
            <FileQuestion size={18} className="mt-0.5 shrink-0 text-anchor" />
            <span>
              <span className="font-semibold text-ink">{cur.title}</span>
              {cur.subject ? ` · ${cur.subject}` : ""} is {dueLabel(cur.dueDate).toLowerCase()},
              but Canvas has no details for it. If you have the notification (a sheet, doc or
              photo), add it now and Anchor will build your study materials.
            </span>
          </p>
          <div className="grid gap-2">
            <Button variant="primary" onClick={addNow}>
              <Upload size={16} /> Add the notification
            </Button>
            <Button variant="ghost" onClick={skip}>
              I don&apos;t have it yet
            </Button>
          </div>
          {queue.length > 1 && (
            <p className="text-center text-[12px] text-ink-faint">
              {i + 1} of {queue.length}
            </p>
          )}
        </div>
      </Modal>
    );
  }

  // ── "did you finish it?" check-in ────────────────────────────
  const completed = () => {
    updateAssessment(cur.id, { status: "completed", progress: 100 });
    mark(DONE_KEY, cur.id);
    advance();
  };
  const notDone = () => {
    updateAssessment(cur.id, { status: "in-progress" });
    mark(DONE_KEY, cur.id);
    advance();
  };
  const saveExtension = () => {
    if (!newDate) return;
    updateAssessment(cur.id, { dueDate: newDate });
    mark(DONE_KEY, cur.id);
    advance();
  };

  return (
    <Modal open onClose={advance} title="Quick check-in" size="sm">
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
            <label className="block text-[13px] font-medium text-ink-soft">New due date</label>
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
