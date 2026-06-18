"use client";

import Link from "next/link";
import { BookOpen, Layers, ClipboardCheck, ArrowUpRight } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Badge";
import { ProgressRing, EmptyState } from "@/components/ui/misc";
import { useData } from "@/store/data";
import { activeAssessments, subjectById, readiness, assessmentCounts } from "@/lib/selectors";

export default function RevisionPage() {
  const d = useData((s) => s.data());
  const ready = activeAssessments(d).filter((a) => a.generated);

  return (
    <div>
      <div className="pt-1">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Revision</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Jump straight into the revision hub for any assessment you&apos;ve generated.
        </p>
      </div>

      {ready.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={BookOpen}
            title="No revision material yet"
            description="Upload an assessment notification and Anchor builds a full revision hub — study guide, practice questions, common mistakes and more."
            action={
              <Link href="/school/subjects">
                <Button variant="primary">Go to subjects</Button>
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ready.map((a) => {
            const subject = subjectById(d, a.subjectId);
            const r = readiness(a);
            const counts = assessmentCounts(d, a.id);
            return (
              <Link key={a.id} href={`/school/subjects/${a.subjectId}/${a.id}?tab=revision`}>
                <GlassCard interactive className="h-full p-5">
                  <div className="flex items-start justify-between">
                    {subject && <Tag color={subject.color} label={subject.name} size="sm" />}
                    <ProgressRing value={r.pct} size={42} color={a.color}>
                      {r.pct}
                    </ProgressRing>
                  </div>
                  <h3 className="mt-3 font-semibold text-ink">{a.title}</h3>
                  <div className="mt-3 flex items-center gap-3 text-[12.5px] text-ink-muted">
                    <span className="inline-flex items-center gap-1">
                      <Layers size={13} /> {counts.flashcards}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <ClipboardCheck size={13} /> {counts.tests}
                    </span>
                    <span className="ml-auto inline-flex items-center gap-1 text-anchor">
                      Revise <ArrowUpRight size={13} />
                    </span>
                  </div>
                </GlassCard>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
