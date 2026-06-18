"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarRange, Layers, FileText, ChevronRight, Quote as QuoteIcon } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Tag, Badge } from "@/components/ui/Badge";
import { FlashcardsView } from "@/components/assessment/FlashcardsView";
import { EmptyState } from "@/components/ui/misc";
import { useData } from "@/store/data";
import { activeSubjects, assessmentsFor } from "@/lib/selectors";
import { useQueryParam } from "@/lib/hooks";
import { cn } from "@/lib/cn";

export default function YearlyReviewPage() {
  const d = useData((s) => s.data());
  const subjects = activeSubjects(d);
  const param = useQueryParam("subject");
  const [sel, setSel] = useState<string>("");

  useEffect(() => {
    if (param) setSel(param);
    else if (!sel && subjects[0]) setSel(subjects[0].id);
  }, [param, subjects, sel]);

  const subject = subjects.find((s) => s.id === sel);
  const assessments = subject ? assessmentsFor(d, subject.id) : [];
  const generated = assessments.filter((a) => a.generated);
  const cards = subject ? d.flashcards.filter((c) => c.subjectId === subject.id) : [];
  const tests = subject ? d.tests.filter((t) => t.subjectId === subject.id) : [];
  const quotes = subject ? d.quotes.filter((q) => q.subjectId === subject.id) : [];

  const concepts = Array.from(
    new Set(generated.flatMap((a) => a.generated!.summary.keyConcepts))
  );
  const examQs = generated.flatMap((a) => a.generated!.revision.examQuestions);
  const mistakes = Array.from(
    new Set(generated.flatMap((a) => a.generated!.revision.commonMistakes))
  );

  return (
    <div>
      <div className="pt-1">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Yearly review</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Everything from a subject, aggregated for end-of-year exam preparation.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {subjects.map((s) => (
          <button
            key={s.id}
            onClick={() => setSel(s.id)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors",
              sel === s.id ? "bg-anchor/10 text-anchor" : "bg-black/[0.04] text-ink-soft hover:bg-black/[0.07]"
            )}
          >
            {s.name}
          </button>
        ))}
      </div>

      {!subject ? (
        <div className="mt-8">
          <EmptyState icon={CalendarRange} title="No subjects yet" description="Create a subject to build its yearly review." />
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          <GlassCard className="relative overflow-hidden p-6">
            <div className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: subject.color }} />
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <Tag color={subject.color} label={subject.name} />
                <h2 className="mt-2 text-xl font-semibold text-ink">Year in review</h2>
              </div>
              <div className="ml-auto flex gap-5 text-center">
                <Stat label="Assessments" value={assessments.length} />
                <Stat label="Flashcards" value={cards.length} />
                <Stat label="Tests" value={tests.length} />
                <Stat label="Concepts" value={concepts.length} />
              </div>
            </div>
          </GlassCard>

          {generated.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Nothing generated yet"
              description="Generate materials in this subject's assessments and they'll aggregate here automatically."
            />
          ) : (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
                <GlassCard className="p-6">
                  <h3 className="text-[15px] font-semibold text-ink">All key concepts</h3>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {concepts.map((c) => (
                      <span key={c} className="rounded-full bg-black/[0.05] px-2.5 py-1 text-[12px] text-ink-soft">
                        {c}
                      </span>
                    ))}
                  </div>
                </GlassCard>
                <GlassCard className="p-6">
                  <h3 className="text-[15px] font-semibold text-ink">Assessments covered</h3>
                  <div className="mt-2 space-y-1">
                    {assessments.map((a) => (
                      <Link
                        key={a.id}
                        href={`/school/subjects/${subject.id}/${a.id}`}
                        className="flex items-center justify-between rounded-xl px-2 py-2 text-sm text-ink-soft transition-colors hover:bg-black/[0.04]"
                      >
                        <span className="flex items-center gap-2">
                          {a.title}
                          {a.generated && <Badge tone="green">ready</Badge>}
                        </span>
                        <ChevronRight size={15} className="text-ink-faint" />
                      </Link>
                    ))}
                  </div>
                </GlassCard>
              </div>

              {examQs.length > 0 && (
                <GlassCard className="p-6">
                  <h3 className="text-[15px] font-semibold text-ink">Exam-style questions</h3>
                  <ul className="mt-3 space-y-2">
                    {examQs.map((q, i) => (
                      <li key={i} className="flex gap-2 text-[14px] leading-relaxed text-ink-soft">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink-faint" />
                        {q}
                      </li>
                    ))}
                  </ul>
                </GlassCard>
              )}

              {mistakes.length > 0 && (
                <GlassCard className="p-6">
                  <h3 className="text-[15px] font-semibold text-ink">Common mistakes to avoid</h3>
                  <ul className="mt-3 space-y-2">
                    {mistakes.map((m, i) => (
                      <li key={i} className="flex gap-2 text-[14px] leading-relaxed text-ink-soft">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber-400" />
                        {m}
                      </li>
                    ))}
                  </ul>
                </GlassCard>
              )}

              {quotes.length > 0 && (
                <GlassCard className="p-6">
                  <h3 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                    <QuoteIcon size={16} className="text-anchor" /> Quote bank
                  </h3>
                  <div className="mt-3 space-y-2">
                    {quotes.map((q) => (
                      <p key={q.id} className="text-[14px] italic text-ink-soft">
                        “{q.text}”{q.technique ? ` — ${q.technique}` : ""}
                      </p>
                    ))}
                  </div>
                </GlassCard>
              )}

              {cards.length > 0 && (
                <GlassCard className="p-6">
                  <h3 className="mb-4 flex items-center gap-2 text-[15px] font-semibold text-ink">
                    <Layers size={16} className="text-anchor" /> Study all flashcards
                  </h3>
                  <FlashcardsView cards={cards} />
                </GlassCard>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-2xl font-semibold tracking-tight text-ink">{value}</p>
      <p className="text-[11.5px] text-ink-muted">{label}</p>
    </div>
  );
}
