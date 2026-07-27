"use client";

import { useEffect, useState } from "react";
import { Play, Pause, TimerReset, Flag, Layers, AlertTriangle, BookOpen } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { Assessment } from "@/lib/types";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/**
 * Rehearsal room for presentations/projects: time yourself against the talk's
 * limit, log run-throughs, and keep the AI's rehearsal guidance on hand.
 */
export function RehearseView({
  assessment,
  cardCount,
  onOpenCueCards,
}: {
  assessment: Assessment;
  cardCount: number;
  onOpenCueCards: () => void;
}) {
  const rev = assessment.generated?.revision;
  const [targetMin, setTargetMin] = useState(3);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [runs, setRuns] = useState<number[]>([]); // newest first

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  const target = targetMin * 60;
  const over = seconds > target;

  function finishRun() {
    if (seconds > 0) setRuns((r) => [seconds, ...r]);
    setSeconds(0);
    setRunning(false);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* timer — the main event */}
      <GlassCard className="p-6 lg:col-span-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-ink">Practice run</h3>
          <label className="flex items-center gap-2 text-[13px] text-ink-muted">
            Time limit
            <input
              type="number"
              min={1}
              max={60}
              value={targetMin}
              onChange={(e) =>
                setTargetMin(Math.max(1, Math.min(60, Number(e.target.value) || 1)))
              }
              className="w-14 rounded-lg border border-black/[0.08] bg-white/70 px-2 py-1 text-center text-[13px] text-ink"
            />
            min
          </label>
        </div>

        <div className="my-8 text-center">
          <div
            className={cn(
              "text-7xl font-semibold tabular-nums tracking-tight",
              over ? "text-red-500" : "text-ink"
            )}
          >
            {fmt(seconds)}
          </div>
          <p className={cn("mt-2 text-[13px]", over ? "text-red-500" : "text-ink-faint")}>
            {over
              ? `${fmt(seconds - target)} over your ${targetMin} min limit`
              : `${fmt(target - seconds)} left of ${targetMin} min`}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button variant="primary" onClick={() => setRunning((r) => !r)}>
            {running ? <Pause size={15} /> : <Play size={15} />}
            {running ? "Pause" : seconds > 0 ? "Resume" : "Start run"}
          </Button>
          <Button variant="secondary" onClick={finishRun} disabled={seconds === 0}>
            <Flag size={15} /> Finish run
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setSeconds(0);
              setRunning(false);
            }}
            disabled={seconds === 0}
          >
            <TimerReset size={15} /> Reset
          </Button>
        </div>

        {runs.length > 0 && (
          <div className="mt-6 border-t border-black/[0.06] pt-4">
            <p className="mb-2 text-[12px] font-medium uppercase tracking-wider text-ink-faint">
              Run-throughs
            </p>
            <ul className="space-y-1.5">
              {runs.map((r, i) => {
                const diff = r - target;
                return (
                  <li
                    key={`${i}-${r}`}
                    className="flex items-center justify-between text-[13.5px]"
                  >
                    <span className="text-ink">Run {runs.length - i}</span>
                    <span className="tabular-nums text-ink-muted">
                      {fmt(r)}{" "}
                      <span className={diff > 0 ? "text-red-500" : "text-emerald-600"}>
                        ({diff > 0 ? `${fmt(diff)} over` : `${fmt(-diff)} under`})
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </GlassCard>

      <div className="space-y-4">
        {/* cue cards hand-off */}
        <GlassCard className="p-5">
          <div className="mb-2 flex items-center gap-2">
            <Layers size={16} className="text-anchor" />
            <h3 className="text-[14px] font-semibold text-ink">Cue cards</h3>
          </div>
          <p className="mb-3 text-[13px] leading-relaxed text-ink-muted">
            {cardCount > 0
              ? `Flip through your ${cardCount} cue cards while the timer runs.`
              : "No cue cards yet — paste your drafted talk and Anchor turns it into cards to rehearse from."}
          </p>
          <Button size="sm" variant="secondary" onClick={onOpenCueCards}>
            {cardCount > 0 ? "Open cue cards" : "Make cue cards"}
          </Button>
        </GlassCard>

        {/* how to rehearse */}
        {rev?.guide?.trim() && (
          <GlassCard className="p-5">
            <div className="mb-2 flex items-center gap-2">
              <BookOpen size={16} className="text-anchor" />
              <h3 className="text-[14px] font-semibold text-ink">How to rehearse</h3>
            </div>
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink-muted">
              {rev.guide}
            </p>
          </GlassCard>
        )}

        {/* watch-outs */}
        {(rev?.commonMistakes?.length ?? 0) > 0 && (
          <GlassCard className="p-5">
            <div className="mb-2 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" />
              <h3 className="text-[14px] font-semibold text-ink">Watch out for</h3>
            </div>
            <ul className="space-y-1.5 text-[13px] leading-relaxed text-ink-muted">
              {rev!.commonMistakes.map((m, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-ink-faint">•</span>
                  {m}
                </li>
              ))}
            </ul>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
