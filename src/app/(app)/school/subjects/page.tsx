"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, GraduationCap, RotateCcw, Trash2, Wand2 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar, EmptyState } from "@/components/ui/misc";
import { CreateSubjectModal } from "@/components/school/CreateSubjectModal";
import { CanvasSyncButton } from "@/components/school/CanvasSyncButton";
import { useData } from "@/store/data";
import {
  activeSubjects,
  trashedSubjects,
  assessmentsFor,
  subjectProgress,
} from "@/lib/selectors";
import { SUBJECT_ICON, SUBJECT_TAGLINE } from "@/lib/subjectMeta";
import { useQueryParam } from "@/lib/hooks";
import { dueThisWeek } from "@/lib/selectors";
import { useEntitlements } from "@/lib/billing/useEntitlements";
import { promptSubjectLimit } from "@/lib/billing/prompt";

export default function SubjectsPage() {
  const router = useRouter();
  const d = useData((s) => s.data());
  const restoreSubject = useData((s) => s.restoreSubject);
  const deleteForever = useData((s) => s.deleteSubjectForever);
  const seedExample = useData((s) => s.seedExample);
  const [open, setOpen] = useState(false);
  const newFlag = useQueryParam("new");
  const ent = useEntitlements();

  const subjects = activeSubjects(d);
  const trashed = trashedSubjects(d);
  const weekDue = dueThisWeek(d);

  // Gate creation on the plan's subject cap.
  const tryOpenCreate = () => {
    if (subjects.length >= ent.subjectLimit) promptSubjectLimit(ent.plan);
    else setOpen(true);
  };

  useEffect(() => {
    if (newFlag === "1") {
      if (activeSubjects(d).length >= ent.subjectLimit) promptSubjectLimit(ent.plan);
      else setOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newFlag]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 pt-1">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Subjects</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Each subject is a workspace — assessments, notes, flashcards and tests, all linked.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CanvasSyncButton />
          <Button variant="primary" onClick={tryOpenCreate}>
            <Plus size={17} /> New subject
          </Button>
        </div>
      </div>

      {subjects.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={GraduationCap}
            title="No subjects yet"
            description="Create your first subject to start uploading assessments and generating study materials."
            action={
              <div className="flex gap-2">
                <Button variant="primary" onClick={tryOpenCreate}>
                  <Plus size={16} /> Create subject
                </Button>
                <Button variant="secondary" onClick={seedExample}>
                  <Wand2 size={15} /> Add a sample subject
                </Button>
              </div>
            }
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {subjects.map((s, i) => {
            const Icon = SUBJECT_ICON[s.type];
            const list = assessmentsFor(d, s.id);
            const progress = subjectProgress(d, s.id);
            const dueCount = weekDue.filter((a) => a.subjectId === s.id).length;
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: Math.min(i * 0.04, 0.3) }}
              >
                <Link href={`/school/subjects/${s.id}`}>
                  <GlassCard interactive className="relative h-full overflow-hidden p-6">
                    <div
                      className="absolute inset-x-0 top-0 h-1"
                      style={{ backgroundColor: s.color }}
                    />
                    <div className="flex items-start justify-between">
                      <div
                        className="grid h-12 w-12 place-items-center rounded-2xl"
                        style={{ backgroundColor: `${s.color}1a` }}
                      >
                        <Icon size={22} style={{ color: s.color }} />
                      </div>
                      {dueCount > 0 && (
                        <Badge tone="amber">{dueCount} due this week</Badge>
                      )}
                    </div>
                    <h3 className="mt-4 text-lg font-semibold tracking-tight text-ink">
                      {s.name}
                    </h3>
                    <p className="mt-0.5 text-[13px] text-ink-muted">
                      {s.description || SUBJECT_TAGLINE[s.type]}
                    </p>
                    <div className="mt-4 flex items-center justify-between text-[13px] text-ink-muted">
                      <span>
                        {list.length} assessment{list.length === 1 ? "" : "s"}
                      </span>
                      <span>{progress}%</span>
                    </div>
                    <ProgressBar value={progress} color={s.color} className="mt-1.5" />
                  </GlassCard>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}

      {trashed.length > 0 && (
        <div className="mt-12">
          <h2 className="text-sm font-semibold text-ink-soft">Recently deleted</h2>
          <p className="text-[13px] text-ink-faint">
            Restore a subject or remove it permanently.
          </p>
          <div className="mt-3 space-y-2">
            {trashed.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 rounded-2xl bg-black/[0.03] px-4 py-3"
              >
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span className="flex-1 text-sm font-medium text-ink-soft">{s.name}</span>
                <Button size="sm" variant="ghost" onClick={() => restoreSubject(s.id)}>
                  <RotateCcw size={14} /> Restore
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-600 hover:bg-red-500/10"
                  onClick={() => {
                    if (
                      confirm(
                        `Permanently delete "${s.name}" and everything inside it? This cannot be undone.`
                      )
                    )
                      deleteForever(s.id);
                  }}
                >
                  <Trash2 size={14} /> Delete
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <CreateSubjectModal
        open={open}
        onClose={() => setOpen(false)}
        onCreated={(s) => router.push(`/school/subjects/${s.id}`)}
      />
    </div>
  );
}
