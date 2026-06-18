"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Plus,
  ArrowLeft,
  CalendarRange,
  Trash2,
  Pencil,
  FileText,
  Clock,
  ChevronRight,
  Sparkles,
  Paperclip,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Badge, Tag } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { ProgressBar, ProgressRing, EmptyState, SectionHeading } from "@/components/ui/misc";
import { CreateAssessmentModal } from "@/components/school/CreateAssessmentModal";
import { useData } from "@/store/data";
import {
  subjectById,
  assessmentsFor,
  subjectProgress,
  readiness,
  assessmentCounts,
} from "@/lib/selectors";
import { SUBJECT_ICON, SUBJECT_TAGLINE } from "@/lib/subjectMeta";
import { SUBJECT_COLORS } from "@/lib/colors";
import { dueLabel, formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";

export default function SubjectPage({
  params,
}: {
  params: { subjectId: string };
}) {
  const router = useRouter();
  const d = useData((s) => s.data());
  const subject = subjectById(d, params.subjectId);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!subject || subject.deletedAt) {
    return (
      <div className="pt-6">
        <EmptyState
          icon={FileText}
          title="Subject not found"
          description="This subject may have been deleted."
          action={
            <Link href="/school/subjects">
              <Button variant="secondary">Back to subjects</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const Icon = SUBJECT_ICON[subject.type];
  const assessments = assessmentsFor(d, subject.id);
  const progress = subjectProgress(d, subject.id);
  const resources = d.resources.filter((r) => r.subjectId === subject.id);

  return (
    <div>
      <Link
        href="/school/subjects"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={15} /> All subjects
      </Link>

      {/* header */}
      <GlassCard className="relative mt-3 overflow-hidden p-6 sm:p-7">
        <div
          className="absolute inset-x-0 top-0 h-1.5"
          style={{ backgroundColor: subject.color }}
        />
        <div className="flex flex-wrap items-start gap-5">
          <div
            className="grid h-16 w-16 place-items-center rounded-3xl"
            style={{ backgroundColor: `${subject.color}1a` }}
          >
            <Icon size={30} style={{ color: subject.color }} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              {subject.name}
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              {subject.description || SUBJECT_TAGLINE[subject.type]}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Tag color={subject.color} label={subject.name} />
              <Badge tone="neutral">
                {assessments.length} assessment{assessments.length === 1 ? "" : "s"}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ProgressRing value={progress} size={58} color={subject.color}>
              {progress}%
            </ProgressRing>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            <Plus size={16} /> New assessment
          </Button>
          <Link href={`/school/yearly?subject=${subject.id}`}>
            <Button variant="secondary">
              <CalendarRange size={16} /> Yearly review
            </Button>
          </Link>
          <Button variant="ghost" onClick={() => setEditOpen(true)}>
            <Pencil size={15} /> Edit
          </Button>
          <Button
            variant="ghost"
            className="text-red-600 hover:bg-red-500/10"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 size={15} /> Delete
          </Button>
        </div>
      </GlassCard>

      {/* assessments */}
      <div className="mt-7">
        <SectionHeading
          title="Assessments"
          subtitle="Open an assessment to upload its notification and generate materials"
          action={
            <Button size="sm" variant="secondary" onClick={() => setCreateOpen(true)}>
              <Plus size={15} /> Add
            </Button>
          }
        />
        {assessments.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No assessments yet"
            description="Add an assessment such as 'Algebra Assignment' or 'Shakespeare Essay', then upload its notification."
            action={
              <Button variant="primary" onClick={() => setCreateOpen(true)}>
                <Plus size={16} /> New assessment
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {assessments
              .slice()
              .sort((a, b) => (a.dueDate || "9").localeCompare(b.dueDate || "9"))
              .map((a, i) => {
                const r = readiness(a);
                const counts = assessmentCounts(d, a.id);
                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.04, 0.25) }}
                  >
                    <Link href={`/school/subjects/${subject.id}/${a.id}`}>
                      <GlassCard interactive className="h-full p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate font-semibold text-ink">{a.title}</h3>
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                              <Tag color={a.color} label={a.term || "Assessment"} size="sm" />
                              <Badge tone={r.tone === "neutral" ? "neutral" : r.tone}>
                                {r.label}
                              </Badge>
                            </div>
                          </div>
                          <ProgressRing value={r.pct} size={42} color={a.color}>
                            {r.pct}
                          </ProgressRing>
                        </div>
                        <p className="mt-3 line-clamp-2 text-[13px] text-ink-muted">
                          {a.description || (a.generated ? "Materials generated and ready to revise." : "Open to upload the notification.")}
                        </p>
                        <div className="mt-3 flex items-center justify-between border-t border-black/[0.05] pt-3 text-[12.5px] text-ink-muted">
                          <span className="inline-flex items-center gap-1.5">
                            <Clock size={13} /> {dueLabel(a.dueDate)}
                          </span>
                          <span className="flex items-center gap-2">
                            {a.generated && (
                              <span className="inline-flex items-center gap-1 text-anchor">
                                <Sparkles size={12} /> Ready
                              </span>
                            )}
                            {counts.flashcards > 0 && <span>{counts.flashcards} cards</span>}
                          </span>
                        </div>
                      </GlassCard>
                    </Link>
                  </motion.div>
                );
              })}
          </div>
        )}
      </div>

      {/* resources */}
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <GlassCard className="p-6">
          <h3 className="text-[15px] font-semibold text-ink">Resources</h3>
          <p className="mt-0.5 text-[13px] text-ink-muted">
            Links and references for this subject.
          </p>
          <div className="mt-3 space-y-2">
            {resources.length === 0 ? (
              <p className="text-[13px] text-ink-faint">
                No resources yet — add them from an assessment workspace.
              </p>
            ) : (
              resources.slice(0, 5).map((r) => (
                <a
                  key={r.id}
                  href={r.url || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm text-ink-soft transition-colors hover:bg-black/[0.04]"
                >
                  <Paperclip size={14} className="text-ink-faint" />
                  <span className="truncate">{r.title}</span>
                </a>
              ))
            )}
          </div>
        </GlassCard>

        <Link href={`/school/yearly?subject=${subject.id}`}>
          <GlassCard interactive className="flex h-full items-center gap-4 p-6">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-anchor/10">
              <CalendarRange size={22} className="text-anchor" />
            </div>
            <div className="flex-1">
              <h3 className="text-[15px] font-semibold text-ink">Yearly review</h3>
              <p className="text-[13px] text-ink-muted">
                Everything from this subject, aggregated for exam prep.
              </p>
            </div>
            <ChevronRight size={18} className="text-ink-faint" />
          </GlassCard>
        </Link>
      </div>

      <CreateAssessmentModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        subjectId={subject.id}
        onCreated={(a) => router.push(`/school/subjects/${subject.id}/${a.id}`)}
      />
      <EditSubjectModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        subjectId={subject.id}
      />
      <DeleteSubjectModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        subjectId={subject.id}
        name={subject.name}
        onDeleted={() => router.push("/school/subjects")}
      />
    </div>
  );
}

function EditSubjectModal({
  open,
  onClose,
  subjectId,
}: {
  open: boolean;
  onClose: () => void;
  subjectId: string;
}) {
  const d = useData((s) => s.data());
  const update = useData((s) => s.updateSubject);
  const subject = subjectById(d, subjectId);
  const [name, setName] = useState(subject?.name ?? "");
  const [desc, setDesc] = useState(subject?.description ?? "");
  const [color, setColor] = useState(subject?.color ?? "#3b82f6");

  if (!subject) return null;

  return (
    <Modal open={open} onClose={onClose} title="Edit subject" size="md">
      <div className="space-y-4">
        <div>
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>Description</Label>
          <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>
        <div>
          <Label>Colour</Label>
          <div className="flex flex-wrap gap-2">
            {SUBJECT_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={cn(
                  "h-8 w-8 rounded-full transition-transform hover:scale-110",
                  color === c && "ring-2 ring-offset-2"
                )}
                style={{ backgroundColor: c, ...( { "--tw-ring-color": c } as React.CSSProperties) }}
              />
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              update(subjectId, { name: name.trim() || subject.name, description: desc.trim() || undefined, color });
              onClose();
            }}
          >
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function DeleteSubjectModal({
  open,
  onClose,
  subjectId,
  name,
  onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  subjectId: string;
  name: string;
  onDeleted: () => void;
}) {
  const trashSubject = useData((s) => s.trashSubject);
  const [confirm, setConfirm] = useState("");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Delete subject"
      description="This moves the subject and everything inside it to Recently deleted. You can restore it from the Subjects page."
      size="md"
    >
      <div className="space-y-4">
        <div className="rounded-2xl bg-red-500/[0.06] px-4 py-3 text-[13px] text-red-700">
          Type <strong>{name}</strong> to confirm.
        </div>
        <Input
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder={name}
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={confirm.trim() !== name}
            onClick={() => {
              trashSubject(subjectId);
              onClose();
              onDeleted();
            }}
          >
            <Trash2 size={15} /> Delete subject
          </Button>
        </div>
      </div>
    </Modal>
  );
}
