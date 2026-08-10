"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Sparkles,
  FileText,
  NotebookPen,
  Layers,
  ClipboardCheck,
  MessageSquare,
  Paperclip,
  BookOpen,
  CheckCircle2,
  ListChecks,
  Target,
  Lightbulb,
  AlertTriangle,
  Plus,
  Trash2,
  CalendarRange,
  Award,
  Check,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Badge, Tag } from "@/components/ui/Badge";
import { Input, Select } from "@/components/ui/Input";
import { EmptyState, ProgressBar } from "@/components/ui/misc";
import { UploadNotification } from "@/components/assessment/UploadNotification";
import { FlashcardsView } from "@/components/assessment/FlashcardsView";
import { RehearseView } from "@/components/assessment/RehearseView";
import { TestsView } from "@/components/assessment/TestsView";
import { EssayTools } from "@/components/assessment/EssayTools";
import { ChatView } from "@/components/chat/ChatView";
import { useData } from "@/store/data";
import { ai } from "@/lib/ai";
import { subjectById, assessmentById, readiness } from "@/lib/selectors";
import { sanitizeCanvasHtml } from "@/lib/sanitizeHtml";
import { SUBJECT_ICON } from "@/lib/subjectMeta";
import { subjectFeatures } from "@/lib/subjectMeta";
import { statusDueLabel } from "@/lib/format";
import { uid } from "@/lib/format";
import { useQueryParam } from "@/lib/hooks";
import type { Assessment, Priority, Subject, Term } from "@/lib/types";
import { cn } from "@/lib/cn";

type TabKey =
  | "summary"
  | "notification"
  | "plan"
  | "notes"
  | "revision"
  | "flashcards"
  | "tests"
  | "tutor"
  | "essay"
  | "resources";

export default function AssessmentWorkspace({
  params,
}: {
  params: { subjectId: string; assessmentId: string };
}) {
  const d = useData((s) => s.data());
  const updateAssessment = useData((s) => s.updateAssessment);
  const subject = subjectById(d, params.subjectId);
  const assessment = assessmentById(d, params.assessmentId);
  const [tab, setTab] = useState<TabKey>("summary");
  const tabParam = useQueryParam("tab");

  useEffect(() => {
    const allowed: TabKey[] = [
      "summary",
      "notification",
      "plan",
      "notes",
      "revision",
      "flashcards",
      "tests",
      "tutor",
      "resources",
    ];
    if (tabParam && allowed.includes(tabParam as TabKey)) setTab(tabParam as TabKey);
  }, [tabParam]);

  if (!subject || !assessment || assessment.deletedAt) {
    return (
      <div className="pt-6">
        <EmptyState
          icon={FileText}
          title="Assessment not found"
          action={
            <Link href={`/school/subjects/${params.subjectId}`}>
              <Button variant="secondary">Back to subject</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const Icon = SUBJECT_ICON[subject.type];
  const features = subjectFeatures(subject.type);
  const r = readiness(assessment);
  const cards = d.flashcards.filter((c) => c.assessmentId === assessment.id);
  const tests = d.tests.filter((t) => t.assessmentId === assessment.id);
  const generated = assessment.generated;

  // A project is produced, not memorised — study tabs (revision / flashcards /
  // tests) only appear when they actually hold content, e.g. cue cards + a
  // rehearsal plan for a presentation, and get labels to match.
  const isProject = (assessment.kind ?? "study") === "project";
  const rev = generated?.revision;
  const hasRevisionContent = !!(
    rev &&
    (rev.guide.trim() ||
      rev.practiceQuestions.length ||
      rev.examQuestions.length ||
      rev.commonMistakes.length ||
      rev.misconceptions.length ||
      rev.extras.length)
  );

  const tabs: { key: TabKey; label: string; icon: typeof FileText }[] = [
    { key: "summary", label: "Summary", icon: Sparkles },
    ...(assessment.notification
      ? [{ key: "notification" as TabKey, label: "Notification", icon: FileText }]
      : []),
    ...(isProject || assessment.steps?.length
      ? [{ key: "plan" as TabKey, label: "Plan", icon: ListChecks }]
      : []),
    ...(!isProject || (generated?.notes.length ?? 0) > 0
      ? [{ key: "notes" as TabKey, label: isProject ? "Notes" : "Study notes", icon: NotebookPen }]
      : []),
    ...(!isProject || hasRevisionContent || cards.length > 0
      ? [{ key: "revision" as TabKey, label: isProject ? "Rehearse" : "Revision", icon: BookOpen }]
      : []),
    // Always available on projects — it hosts the "cue cards from my draft" tool.
    { key: "flashcards" as TabKey, label: isProject ? "Cue cards" : "Flashcards", icon: Layers },
    ...(!isProject || tests.length > 0
      ? [{ key: "tests" as TabKey, label: "Tests", icon: ClipboardCheck }]
      : []),
    ...(features.essayTools
      ? [{ key: "essay" as TabKey, label: "Essay tools", icon: BookOpen }]
      : []),
    { key: "tutor", label: "AI Tutor", icon: MessageSquare },
    { key: "resources", label: "Resources", icon: Paperclip },
  ];

  // If the active tab is hidden (e.g. after toggling Study ↔ Project), render
  // Summary instead of an orphaned panel. Derived, not an effect — this sits
  // below an early return, so hooks aren't allowed here.
  const activeTab = tabs.some((t) => t.key === tab) ? tab : "summary";

  return (
    <div>
      <Link
        href={`/school/subjects/${subject.id}`}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={15} /> {subject.name}
      </Link>

      {/* header */}
      <GlassCard className="relative mt-3 overflow-hidden p-6">
        <div className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: assessment.color }} />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Icon size={18} style={{ color: subject.color }} />
              <Tag color={subject.color} label={subject.name} size="sm" />
              <Tag color={assessment.color} label={assessment.term || "Assessment"} size="sm" />
              <button
                onClick={() =>
                  updateAssessment(assessment.id, {
                    kind: (assessment.kind ?? "study") === "project" ? "study" : "project",
                  })
                }
                title="Switch between study (test/exam) and project (submission)"
                className="transition-transform hover:scale-105"
              >
                <Badge tone={(assessment.kind ?? "study") === "project" ? "blue" : "neutral"}>
                  {(assessment.kind ?? "study") === "project" ? "Project" : "Study"}
                </Badge>
              </button>
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              {assessment.title}
            </h1>
            {assessment.description && (
              <p className="mt-1 text-sm text-ink-muted">{assessment.description}</p>
            )}
          </div>
          <Badge tone={r.tone === "neutral" ? "neutral" : r.tone}>{r.label}</Badge>
        </div>
        <MetaControls assessment={assessment} />
      </GlassCard>

      {assessment.result &&
        (assessment.result.score != null || assessment.result.grade) && (
          <ResultCard result={assessment.result} />
        )}

      {/* upload — the primary focus */}
      <div className="mt-5">
        <UploadNotification
          subject={subject}
          assessment={assessment}
          onGenerated={() => setTab("summary")}
        />
      </div>

      {/* tabs */}
      <div className="no-scrollbar mt-6 flex gap-1.5 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[13.5px] font-medium transition-colors",
              activeTab === t.key
                ? "bg-anchor/10 text-anchor"
                : "text-ink-soft hover:bg-black/[0.04]"
            )}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
          >
            {activeTab === "summary" &&
              (generated ? (
                <SummaryView assessment={assessment} />
              ) : (
                <LockedHint label="summary" />
              ))}
            {activeTab === "notification" && <NotificationView assessment={assessment} />}
            {activeTab === "notes" &&
              (generated ? <NotesView assessment={assessment} /> : <LockedHint label="study notes" />)}
            {activeTab === "revision" &&
              (isProject ? (
                <RehearseView
                  assessment={assessment}
                  cardCount={cards.length}
                  onOpenCueCards={() => setTab("flashcards")}
                />
              ) : generated ? (
                <RevisionView assessment={assessment} />
              ) : (
                <LockedHint label="revision hub" />
              ))}
            {activeTab === "flashcards" && (
              <FlashcardsView cards={cards} subject={subject} assessment={assessment} />
            )}
            {activeTab === "tests" && (
              <TestsView tests={tests} subject={subject} assessment={assessment} />
            )}
            {activeTab === "plan" && <PlanView assessment={assessment} />}
            {activeTab === "essay" && <EssayTools subject={subject} assessment={assessment} />}
            {activeTab === "tutor" && <AssessmentTutor subject={subject} assessment={assessment} />}
            {activeTab === "resources" && <ResourcesView subject={subject} assessment={assessment} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function LockedHint({ label }: { label: string }) {
  return (
    <EmptyState
      icon={Sparkles}
      title={`Your ${label} will appear here`}
      description="Upload the assessment notification above and Anchor will generate this automatically."
    />
  );
}

function ResultCard({ result }: { result: NonNullable<Assessment["result"]> }) {
  const mark =
    result.score != null && result.pointsPossible
      ? `${result.score} / ${result.pointsPossible}`
      : result.grade || (result.score != null ? String(result.score) : "Graded");
  const pct =
    result.score != null && result.pointsPossible
      ? Math.round((result.score / result.pointsPossible) * 100)
      : null;
  return (
    <GlassCard className="mt-4 p-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/[0.12]">
          <Award size={22} className="text-emerald-600" />
        </div>
        <div>
          <p className="text-[13px] text-ink-muted">Your result · from Canvas</p>
          <p className="text-2xl font-semibold tracking-tight text-ink">
            {mark}
            {pct != null && (
              <span className="ml-2 text-base font-medium text-ink-muted">{pct}%</span>
            )}
          </p>
        </div>
      </div>
      {result.feedback.length > 0 && (
        <div className="mt-4">
          <p className="text-[13px] font-semibold text-ink">Teacher feedback</p>
          <ul className="mt-2 space-y-2">
            {result.feedback.map((f, i) => (
              <li
                key={i}
                className="whitespace-pre-line rounded-2xl bg-black/[0.03] px-4 py-2.5 text-[13.5px] leading-relaxed text-ink-soft"
              >
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}
    </GlassCard>
  );
}

function PlanView({ assessment }: { assessment: Assessment }) {
  const update = useData((s) => s.updateAssessment);
  const steps = assessment.steps ?? [];
  const [text, setText] = useState("");
  const done = steps.filter((s) => s.done).length;

  function setSteps(next: typeof steps) {
    update(assessment.id, { steps: next });
  }

  if (steps.length === 0) {
    return (
      <EmptyState
        icon={ListChecks}
        title="No breakdown yet"
        description="Generate from the notification above to break this project into steps — or add your own below."
        action={
          <Button
            variant="secondary"
            onClick={() => setSteps([{ id: uid(), text: "First step", done: false }])}
          >
            <Plus size={15} /> Add a step
          </Button>
        }
      />
    );
  }

  return (
    <GlassCard className="p-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-ink">Project breakdown</h3>
        <span className="text-[13px] text-ink-muted">
          {done}/{steps.length} done
        </span>
      </div>
      <ProgressBar value={steps.length ? (done / steps.length) * 100 : 0} className="mb-4" />
      <div className="space-y-1.5">
        {steps.map((s) => (
          <div key={s.id} className="flex items-center gap-2.5">
            <button
              onClick={() =>
                setSteps(steps.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)))
              }
              className={cn(
                "grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors",
                s.done
                  ? "border-anchor bg-anchor text-white"
                  : "border-black/20 text-transparent hover:border-anchor"
              )}
            >
              <Check size={12} />
            </button>
            <span
              className={cn(
                "flex-1 text-[14px]",
                s.done ? "text-ink-faint line-through" : "text-ink-soft"
              )}
            >
              {s.text}
            </span>
            <button
              onClick={() => setSteps(steps.filter((x) => x.id !== s.id))}
              className="text-ink-faint hover:text-red-600"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a step…"
          className="h-9 text-[13px]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && text.trim()) {
              setSteps([...steps, { id: uid(), text: text.trim(), done: false }]);
              setText("");
            }
          }}
        />
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            if (!text.trim()) return;
            setSteps([...steps, { id: uid(), text: text.trim(), done: false }]);
            setText("");
          }}
        >
          <Plus size={14} />
        </Button>
      </div>
    </GlassCard>
  );
}

// ── meta controls ───────────────────────────────────────────────

function MetaControls({ assessment }: { assessment: Assessment }) {
  const update = useData((s) => s.updateAssessment);
  return (
    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Field label="Due date">
        <Input
          type="date"
          value={assessment.dueDate ?? ""}
          onChange={(e) => update(assessment.id, { dueDate: e.target.value || undefined })}
          className="h-9 text-[13px]"
        />
      </Field>
      <Field label="Term">
        <Select
          value={assessment.term ?? "Term 1"}
          onChange={(e) => update(assessment.id, { term: e.target.value as Term })}
          className="h-9 text-[13px]"
        >
          {["Term 1", "Term 2", "Term 3", "Term 4"].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </Select>
      </Field>
      <Field label="Priority">
        <Select
          value={assessment.priority}
          onChange={(e) => update(assessment.id, { priority: e.target.value as Priority })}
          className="h-9 text-[13px]"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </Select>
      </Field>
      <Field label="Status">
        <Select
          value={assessment.status}
          onChange={(e) => {
            const status = e.target.value as Assessment["status"];
            update(assessment.id, {
              status,
              progress: status === "completed" ? 100 : assessment.progress,
            });
          }}
          className="h-9 text-[13px]"
        >
          <option value="not-started">Not started</option>
          <option value="in-progress">In progress</option>
          <option value="completed">Completed</option>
        </Select>
      </Field>
      <div className="col-span-2 sm:col-span-4">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[12px] font-medium text-ink-muted">Progress</span>
          <span className="text-[12px] text-ink-muted">{assessment.progress}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={assessment.progress}
          onChange={(e) => {
            const progress = Number(e.target.value);
            update(assessment.id, {
              progress,
              status:
                progress === 100
                  ? "completed"
                  : progress > 0
                  ? "in-progress"
                  : assessment.status,
            });
          }}
          className="w-full accent-anchor"
        />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[12px] font-medium text-ink-muted">{label}</p>
      {children}
    </div>
  );
}

// ── summary ─────────────────────────────────────────────────────

const NOTIF_PROSE =
  "text-[14px] leading-relaxed text-ink [&_a]:font-medium [&_a]:text-anchor [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-black/10 [&_blockquote]:pl-3 [&_blockquote]:text-ink-muted [&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mb-1.5 [&_h3]:mt-3 [&_h3]:text-[15px] [&_h3]:font-semibold [&_hr]:my-4 [&_hr]:border-black/[0.08] [&_img]:my-2 [&_img]:max-w-full [&_img]:rounded-xl [&_li]:my-1 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_strong]:font-semibold [&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-black/10 [&_td]:p-2 [&_th]:border [&_th]:border-black/10 [&_th]:bg-black/[0.03] [&_th]:p-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5";

/** The exact assessment notification: Canvas's original HTML or the uploaded
 *  text, plus an optional AI re-format (structure only — wording verbatim). */
function NotificationView({ assessment }: { assessment: Assessment }) {
  const setNotification = useData((s) => s.setNotification);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<"formatted" | "original">("formatted");
  const n = assessment.notification;
  if (!n) return null;

  const aiHtml = n.aiHtml ? sanitizeCanvasHtml(n.aiHtml) : "";
  const origHtml = n.html ? sanitizeCanvasHtml(n.html) : "";
  const showFormatted = !!aiHtml && view === "formatted";

  async function tidy() {
    if (!n || busy) return;
    setBusy(true);
    try {
      const html = await ai.formatNotification(n.rawText);
      if (html && html.length > 4) {
        setNotification(assessment.id, { ...n, aiHtml: html });
        setView("formatted");
      }
    } catch {
      // Plan block handled by the global upgrade modal.
    } finally {
      setBusy(false);
    }
  }

  return (
    <GlassCard className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-black/[0.06] pb-3">
        <div className="flex items-center gap-2 text-[13px]">
          <FileText size={15} className="text-ink-faint" />
          <span className="font-medium text-ink">{n.fileName || "Notification"}</span>
          <span className="text-[12px] text-ink-faint">
            · {n.fileType === "canvas" ? "synced" : "uploaded"}{" "}
            {new Date(n.uploadedAt).toLocaleDateString(undefined, {
              day: "numeric",
              month: "short",
            })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {aiHtml ? (
            <div className="flex gap-1 rounded-full bg-black/[0.04] p-0.5 text-[12px] font-medium">
              {(["formatted", "original"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    "rounded-full px-3 py-1 capitalize transition-colors",
                    view === v ? "bg-white text-ink shadow-sm" : "text-ink-soft"
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          ) : (
            <Button size="sm" variant="secondary" onClick={tidy} disabled={busy}>
              <Sparkles size={14} /> {busy ? "Formatting…" : "Format with AI"}
            </Button>
          )}
        </div>
      </div>
      {showFormatted ? (
        <div className={NOTIF_PROSE} dangerouslySetInnerHTML={{ __html: aiHtml }} />
      ) : origHtml ? (
        <div className={NOTIF_PROSE} dangerouslySetInnerHTML={{ __html: origHtml }} />
      ) : (
        <pre className="whitespace-pre-wrap font-sans text-[14px] leading-relaxed text-ink">
          {n.rawText}
        </pre>
      )}
      {showFormatted && (
        <p className="mt-4 border-t border-black/[0.06] pt-3 text-[12px] text-ink-faint">
          AI-tidied layout — the wording is untouched. Switch to “Original” to
          see it exactly as it came in.
        </p>
      )}
    </GlassCard>
  );
}

function SummaryView({ assessment }: { assessment: Assessment }) {
  const s = assessment.generated!.summary;
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <GlassCard className="p-6 lg:col-span-2">
        <h3 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
          <Sparkles size={16} className="text-anchor" /> Overview
        </h3>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{s.overview}</p>
        <List icon={ListChecks} title="Key requirements" items={s.requirements} className="mt-5" />
        <List icon={Target} title="Outcomes" items={s.outcomes} className="mt-5" />
        <List icon={CheckCircle2} title="Objectives" items={s.objectives} className="mt-5" />
      </GlassCard>
      <div className="space-y-4">
        <GlassCard className="p-6">
          <h3 className="text-[15px] font-semibold text-ink">At a glance</h3>
          <div className="mt-3 space-y-2.5 text-sm">
            <Row
              label="Due"
              value={statusDueLabel(s.dueDate || assessment.dueDate, assessment.status === "completed")}
            />
            {s.weighting && <Row label="Weighting" value={s.weighting} />}
            <Row label="Term" value={assessment.term || "—"} />
            <Row label="Priority" value={assessment.priority} />
          </div>
        </GlassCard>
        <GlassCard className="p-6">
          <h3 className="text-[15px] font-semibold text-ink">Key concepts</h3>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {s.keyConcepts.map((c) => (
              <span key={c} className="rounded-full bg-black/[0.05] px-2.5 py-1 text-[12px] text-ink-soft">
                {c}
              </span>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function NotesView({ assessment }: { assessment: Assessment }) {
  const notes = assessment.generated!.notes;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {notes.map((n) => (
        <GlassCard key={n.id} className="p-6">
          <h3 className="text-[15px] font-semibold text-ink">{n.heading}</h3>
          <div className="mt-2 whitespace-pre-line text-[14px] leading-relaxed text-ink-soft">
            {n.body}
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

function RevisionView({ assessment }: { assessment: Assessment }) {
  const rev = assessment.generated!.revision;
  return (
    <div className="space-y-4">
      <GlassCard className="p-6">
        <h3 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
          <BookOpen size={16} className="text-anchor" /> Study guide
        </h3>
        <p className="mt-3 whitespace-pre-line text-[14px] leading-relaxed text-ink-soft">
          {rev.guide}
        </p>
      </GlassCard>
      <div className="grid gap-4 md:grid-cols-2">
        <List card icon={ListChecks} title="Practice questions" items={rev.practiceQuestions} />
        <List card icon={Target} title="Exam-style questions" items={rev.examQuestions} />
        <List card icon={AlertTriangle} title="Common mistakes" items={rev.commonMistakes} tone="amber" />
        <List card icon={Lightbulb} title="Key misconceptions" items={rev.misconceptions} tone="amber" />
      </div>
      {rev.extras.map((ex) => (
        <List key={ex.title} card icon={NotebookPen} title={ex.title} items={ex.items} />
      ))}
    </div>
  );
}

function List({
  icon: Icon,
  title,
  items,
  className,
  card,
  tone,
}: {
  icon: typeof ListChecks;
  title: string;
  items: string[];
  className?: string;
  card?: boolean;
  tone?: "amber";
}) {
  const inner = (
    <>
      <h4 className="flex items-center gap-2 text-[14px] font-semibold text-ink">
        <Icon size={15} className={tone === "amber" ? "text-amber-500" : "text-anchor"} />
        {title}
      </h4>
      <ul className="mt-2.5 space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-[13.5px] leading-relaxed text-ink-soft">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink-faint" />
            {it}
          </li>
        ))}
      </ul>
    </>
  );
  if (card) return <GlassCard className={cn("p-6", className)}>{inner}</GlassCard>;
  return <div className={className}>{inner}</div>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-muted">{label}</span>
      <span className="font-medium capitalize text-ink">{value}</span>
    </div>
  );
}

// ── tutor ───────────────────────────────────────────────────────

function AssessmentTutor({ subject, assessment }: { subject: Subject; assessment: Assessment }) {
  const d = useData((s) => s.data());
  const createChat = useData((s) => s.createChat);
  const deleteChat = useData((s) => s.deleteChat);
  const chats = d.chats.filter((c) => c.assessmentId === assessment.id);
  const [activeId, setActiveId] = useState<string | null>(chats[0]?.id ?? null);

  function newChat() {
    const c = createChat({
      title: "New chat",
      subjectId: subject.id,
      assessmentId: assessment.id,
    });
    setActiveId(c.id);
  }

  const active = chats.find((c) => c.id === activeId) ?? chats[0];

  return (
    <GlassCard className="flex h-[560px] flex-col p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {chats.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveId(c.id)}
            className={cn(
              "group flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors",
              active?.id === c.id ? "bg-anchor/10 text-anchor" : "bg-black/[0.04] text-ink-soft hover:bg-black/[0.07]"
            )}
          >
            <span className="max-w-[140px] truncate">{c.title}</span>
            <Trash2
              size={12}
              className="opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-60"
              onClick={(e) => {
                e.stopPropagation();
                deleteChat(c.id);
                if (active?.id === c.id) setActiveId(null);
              }}
            />
          </button>
        ))}
        <Button size="sm" variant="secondary" onClick={newChat}>
          <Plus size={13} /> New
        </Button>
      </div>
      <div className="min-h-0 flex-1">
        {active ? (
          <ChatView chatId={active.id} />
        ) : (
          <div className="grid h-full place-items-center">
            <Button variant="primary" onClick={newChat}>
              <MessageSquare size={16} /> Start a chat about this assessment
            </Button>
          </div>
        )}
      </div>
    </GlassCard>
  );
}

// ── resources ───────────────────────────────────────────────────

function ResourcesView({ subject, assessment }: { subject: Subject; assessment: Assessment }) {
  const d = useData((s) => s.data());
  const add = useData((s) => s.addResource);
  const del = useData((s) => s.deleteResource);
  const resources = d.resources.filter((r) => r.assessmentId === assessment.id);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-2 rounded-3xl border border-black/[0.06] bg-white/50 p-4">
        <div className="min-w-[160px] flex-1">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Resource title" />
        </div>
        <div className="min-w-[160px] flex-1">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https:// (optional)" />
        </div>
        <Button
          variant="primary"
          onClick={() => {
            if (!title.trim()) return;
            add({
              subjectId: subject.id,
              assessmentId: assessment.id,
              title: title.trim(),
              url: url.trim() || undefined,
              kind: url.trim() ? "link" : "note",
            });
            setTitle("");
            setUrl("");
          }}
        >
          <Plus size={16} /> Add
        </Button>
      </div>
      {resources.length === 0 ? (
        <EmptyState icon={Paperclip} title="No resources yet" description="Add links and references for this assessment." />
      ) : (
        <div className="space-y-2">
          {resources.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-2xl border border-black/[0.06] bg-white/60 px-4 py-3">
              <Paperclip size={15} className="text-anchor" />
              {r.url ? (
                <a href={r.url} target="_blank" rel="noreferrer" className="flex-1 truncate text-sm text-ink hover:underline">
                  {r.title}
                </a>
              ) : (
                <span className="flex-1 truncate text-sm text-ink">{r.title}</span>
              )}
              <button onClick={() => del(r.id)} className="text-ink-faint hover:text-red-600">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
