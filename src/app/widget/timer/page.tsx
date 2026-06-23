"use client";

import { useEffect, useRef, useState } from "react";
import { Timer, Play, Pause, RotateCcw } from "lucide-react";
import { WidgetFrame } from "@/components/widget/WidgetFrame";
import { cn } from "@/lib/cn";

const WORK = 25 * 60;
const BREAK = 5 * 60;

function notify(title: string, body: string) {
  if (typeof window !== "undefined" && window.anchorDesktop?.notify) {
    window.anchorDesktop.notify(title, body);
  } else if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    new Notification(title, { body });
  }
}

export default function TimerWidget() {
  const [mode, setMode] = useState<"work" | "break">("work");
  const [left, setLeft] = useState(WORK);
  const [running, setRunning] = useState(false);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    tick.current = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => {
      if (tick.current) clearInterval(tick.current);
    };
  }, [running]);

  useEffect(() => {
    if (left > 0) return;
    setRunning(false);
    if (mode === "work") {
      notify("Focus session done", "Nice work — take a 5 minute break.");
      setMode("break");
      setLeft(BREAK);
    } else {
      notify("Break over", "Back to it — start your next focus session.");
      setMode("work");
      setLeft(WORK);
    }
  }, [left, mode]);

  const switchMode = (m: "work" | "break") => {
    setRunning(false);
    setMode(m);
    setLeft(m === "work" ? WORK : BREAK);
  };
  const reset = () => {
    setRunning(false);
    setLeft(mode === "work" ? WORK : BREAK);
  };

  const mins = String(Math.floor(Math.max(0, left) / 60)).padStart(2, "0");
  const secs = String(Math.max(0, left) % 60).padStart(2, "0");

  return (
    <WidgetFrame icon={Timer} title="Focus timer" requireAuth={false}>
      <div className="flex h-full flex-col items-center justify-center gap-5">
        <div className="flex items-center rounded-full bg-black/[0.05] p-0.5 text-[12.5px] font-medium">
          {(["work", "break"] as const).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={cn(
                "rounded-full px-3.5 py-1 capitalize transition-colors",
                mode === m ? "bg-white text-ink shadow-soft" : "text-ink-soft"
              )}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="font-semibold tabular-nums tracking-tight text-ink" style={{ fontSize: 64 }}>
          {mins}:{secs}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setRunning((r) => !r)}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-anchor text-white shadow-glow transition-colors hover:bg-anchor-600"
          >
            {running ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
          </button>
          <button
            onClick={reset}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-black/[0.05] text-ink-soft transition-colors hover:bg-black/[0.08]"
          >
            <RotateCcw size={18} />
          </button>
        </div>
      </div>
    </WidgetFrame>
  );
}
