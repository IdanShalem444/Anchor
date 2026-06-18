"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FileText, Clock, Sparkles } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge, Tag } from "@/components/ui/Badge";
import { ProgressRing, EmptyState } from "@/components/ui/misc";
import { Button } from "@/components/ui/Button";
import { useData } from "@/store/data";
import { activeSubjects, assessmentsFor, readiness } from "@/lib/selectors";
import { dueLabel } from "@/lib/format";

export default function AssessmentsPage() {
  const d = useData((s) => s.data());
  const subjects = activeSubjects(d);
  const total = d.assessments.filter((a) => !a.deletedAt).length;

  return (
    <div>
      <div className="pt-1">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Assessments</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Every assessment across your subjects, grouped and linked.
        </p>
      </div>

      {total === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={FileText}
            title="No assessments yet"
            description="Open a subject to add an assessment and upload its notification."
            action={
              <Link href="/school/subjects">
                <Button variant="primary">Go to subjects</Button>
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {subjects.map((s) => {
            const list = assessmentsFor(d, s.id);
            if (list.length === 0) return null;
            return (
              <div key={s.id}>
                <div className="mb-3 flex items-center gap-2">
                  <Tag color={s.color} label={s.name} />
                  <span className="text-[13px] text-ink-muted">
                    {list.length} assessment{list.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {list.map((a, i) => {
                    const r = readiness(a);
                    return (
                      <motion.div
                        key={a.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.03, 0.2) }}
                      >
                        <Link href={`/school/subjects/${s.id}/${a.id}`}>
                          <GlassCard interactive className="flex h-full items-center gap-4 p-4">
                            <ProgressRing value={r.pct} size={46} color={a.color}>
                              {r.pct}
                            </ProgressRing>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-ink">{a.title}</p>
                              <div className="mt-1 flex items-center gap-1.5">
                                <Badge tone={r.tone === "neutral" ? "neutral" : r.tone}>{r.label}</Badge>
                                {a.generated && <Sparkles size={13} className="text-anchor" />}
                              </div>
                              <p className="mt-1 inline-flex items-center gap-1 text-[12px] text-ink-muted">
                                <Clock size={12} /> {dueLabel(a.dueDate)}
                              </p>
                            </div>
                          </GlassCard>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
