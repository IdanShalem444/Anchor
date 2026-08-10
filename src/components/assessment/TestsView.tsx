"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  ClipboardCheck,
  Check,
  X,
  ChevronLeft,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, SegmentedControl } from "@/components/ui/misc";
import { useData } from "@/store/data";
import { ai } from "@/lib/ai";
import type { Assessment, Difficulty, PracticeTest, Subject } from "@/lib/types";
import { cn } from "@/lib/cn";

const DIFFS: { value: Difficulty; label: string }[] = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
  { value: "exam", label: "Exam" },
];

export function TestsView({
  tests,
  subject,
  assessment,
}: {
  tests: PracticeTest[];
  subject?: Subject;
  assessment?: Assessment;
}) {
  const addTest = useData((s) => s.addTest);
  const del = useData((s) => s.deleteTest);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [busy, setBusy] = useState(false);
  const [takingId, setTakingId] = useState<string | null>(null);

  const canGenerate = !!(subject && assessment?.notification?.rawText);

  async function generate() {
    if (!subject || !assessment) return;
    setBusy(true);
    try {
      const t = await ai.generateTest({
        subjectType: subject.type,
        subjectName: subject.name,
        assessmentTitle: assessment.title,
        text: assessment.notification?.rawText || assessment.title,
        difficulty,
      });
      const created = addTest({
        subjectId: subject.id,
        assessmentId: assessment.id,
        title: t.title,
        difficulty,
        questions: t.questions,
        lastScore: null,
      });
      setTakingId(created.id);
    } catch {
      // Plan block (limit / locked) is handled by the global upgrade modal.
    } finally {
      setBusy(false);
    }
  }

  const taking = tests.find((t) => t.id === takingId);
  if (taking) {
    return <TakeTest test={taking} onBack={() => setTakingId(null)} />;
  }

  return (
    <div>
      {subject && assessment && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-3xl border border-black/[0.06] bg-white/50 p-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-ink">Generate a practice test</p>
            <p className="text-[12.5px] text-ink-muted">
              Multiple choice, short and extended response — at your chosen level.
            </p>
          </div>
          <SegmentedControl options={DIFFS} value={difficulty} onChange={setDifficulty} />
          <Button variant="primary" onClick={generate} disabled={busy || !canGenerate}>
            <Sparkles size={15} /> {busy ? "Generating…" : "Generate"}
          </Button>
        </div>
      )}
      {!canGenerate && subject && assessment && (
        <p className="mb-4 text-[13px] text-ink-muted">
          Upload the assessment notification first to generate tailored tests.
        </p>
      )}

      {tests.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No practice tests yet"
          description="Generate a test above, or they'll appear here once created from your assessments."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {tests.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col rounded-3xl border border-black/[0.06] bg-white/60 p-5"
            >
              <div className="flex items-start justify-between">
                <Badge tone="anchor">{t.difficulty}</Badge>
                <button
                  onClick={() => del(t.id)}
                  className="text-ink-faint transition-colors hover:text-red-600"
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <h4 className="mt-3 font-semibold text-ink">{t.title}</h4>
              <p className="mt-1 text-[13px] text-ink-muted">
                {t.questions.length} questions
                {t.lastScore != null && ` · last score ${t.lastScore}%`}
              </p>
              <Button
                variant="secondary"
                className="mt-4"
                onClick={() => setTakingId(t.id)}
              >
                {t.lastScore != null ? "Retake" : "Start test"}
              </Button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function TakeTest({ test, onBack }: { test: PracticeTest; onBack: () => void }) {
  const setScore = useData((s) => s.setTestScore);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const mcqs = test.questions.filter((q) => q.type === "mcq");
  const correct = mcqs.filter((q) => answers[q.id] === q.answerIndex).length;
  const score = mcqs.length ? Math.round((correct / mcqs.length) * 100) : 0;

  function submit() {
    setSubmitted(true);
    if (mcqs.length) setScore(test.id, score);
  }

  return (
    <div>
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-muted hover:text-ink"
      >
        <ChevronLeft size={15} /> Back to tests
      </button>
      <div className="mt-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-ink">{test.title}</h3>
        <Badge tone="anchor">{test.difficulty}</Badge>
      </div>

      {submitted && mcqs.length > 0 && (
        <div className="mt-4 rounded-3xl bg-anchor/[0.07] px-5 py-4">
          <p className="text-sm text-ink-soft">Multiple-choice score</p>
          <p className="text-3xl font-semibold text-anchor">{score}%</p>
          <p className="text-[13px] text-ink-muted">
            {correct} of {mcqs.length} correct. Review the model answers below.
          </p>
        </div>
      )}

      <div className="mt-5 space-y-5">
        {test.questions.map((q, qi) => (
          <div key={q.id} className="rounded-3xl border border-black/[0.06] bg-white/60 p-5">
            <div className="flex items-start gap-2">
              <span className="text-[13px] font-semibold text-ink-faint">{qi + 1}.</span>
              <p className="font-medium text-ink">{q.prompt}</p>
            </div>

            {q.type === "mcq" && q.options && (
              <div className="mt-3 space-y-2">
                {q.options.map((opt, oi) => {
                  const chosen = answers[q.id] === oi;
                  const isCorrect = q.answerIndex === oi;
                  return (
                    <button
                      key={oi}
                      disabled={submitted}
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-2xl border px-4 py-2.5 text-left text-[14px] transition-colors",
                        submitted && isCorrect && "border-emerald-400 bg-emerald-500/10 text-emerald-800",
                        submitted && chosen && !isCorrect && "border-red-300 bg-red-500/10 text-red-700",
                        !submitted && chosen && "border-anchor/40 bg-anchor/[0.06]",
                        !submitted && !chosen && "border-black/[0.07] hover:border-black/[0.15]"
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[11px]",
                          chosen ? "border-anchor text-anchor" : "border-black/15 text-ink-faint"
                        )}
                      >
                        {String.fromCharCode(65 + oi)}
                      </span>
                      <span className="flex-1">{opt}</span>
                      {submitted && isCorrect && <Check size={15} className="text-emerald-600" />}
                      {submitted && chosen && !isCorrect && <X size={15} className="text-red-500" />}
                    </button>
                  );
                })}
              </div>
            )}

            {q.type !== "mcq" && (
              <div className="mt-3">
                <textarea
                  disabled={submitted}
                  placeholder="Write your response…"
                  className="min-h-[90px] w-full resize-y rounded-2xl border border-black/[0.07] bg-white/70 px-4 py-3 text-[14px] focus:border-anchor/30 focus:outline-none focus:ring-4 focus:ring-anchor/10"
                />
                {submitted && q.modelAnswer && (
                  <div className="mt-2 rounded-2xl bg-black/[0.03] px-4 py-3 text-[13px] text-ink-soft">
                    <span className="font-semibold text-ink">Model answer · </span>
                    {q.modelAnswer}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {!submitted ? (
        <Button variant="primary" className="mt-5" onClick={submit}>
          Submit test
        </Button>
      ) : (
        <Button variant="secondary" className="mt-5" onClick={onBack}>
          Done
        </Button>
      )}
    </div>
  );
}
