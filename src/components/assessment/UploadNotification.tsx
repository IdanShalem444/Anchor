"use client";

import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  FileType2,
  Image as ImageIcon,
  ClipboardPaste,
  Sparkles,
  RefreshCw,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { useData } from "@/store/data";
import { researchForSubject } from "@/lib/selectors";
import { ai } from "@/lib/ai";
import { extractText, fileToDataUrl } from "@/lib/extract";
import { uid } from "@/lib/format";
import type { Assessment, Subject } from "@/lib/types";
import { cn } from "@/lib/cn";

const STEPS = [
  "Reading your notification…",
  "Extracting requirements & dates…",
  "Writing study notes…",
  "Building flashcards & revision…",
];

export function UploadNotification({
  subject,
  assessment,
  onGenerated,
}: {
  subject: Subject;
  assessment: Assessment;
  onGenerated?: () => void;
}) {
  const setNotification = useData((s) => s.setNotification);
  const setGenerated = useData((s) => s.setGenerated);
  const addFlashcards = useData((s) => s.addFlashcards);
  const updateAssessment = useData((s) => s.updateAssessment);

  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [text, setText] = useState(assessment.notification?.rawText ?? "");
  const [fileName, setFileName] = useState(assessment.notification?.fileName ?? "");
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [editing, setEditing] = useState(false);

  const hasGenerated = !!assessment.generated;
  const showCompact = hasGenerated && !editing;

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setStep((s) => (s + 1) % STEPS.length), 900);
    return () => clearInterval(t);
  }, [busy]);

  // Auto-download attached Canvas files (the real notification is often a PDF)
  // the first time a Canvas-linked assessment is opened, and merge their text in.
  const canvasPulled = useRef(false);
  useEffect(() => {
    if (canvasPulled.current) return;
    const n = assessment.notification;
    if (!n || n.fileType !== "canvas" || assessment.generated) return;
    if (!subject.canvasCourseId || !assessment.canvasId) return;
    if ((n.rawText || "").includes("[Attached:")) {
      canvasPulled.current = true;
      return;
    }
    canvasPulled.current = true;
    (async () => {
      try {
        const res = await fetch("/api/canvas/notification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId: subject.canvasCourseId,
            assignmentId: assessment.canvasId,
          }),
        });
        const d = await res.json();
        if (res.ok && d.text) {
          const merged = `${n.rawText || ""}\n\n${d.text}`.trim();
          setNotification(assessment.id, { ...n, rawText: merged });
          setText(merged);
        }
      } catch {
        // best-effort — the description-based brief still stands
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessment.id]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    setNote(null);
    const res = await extractText(file);
    setFileName(res.fileName);
    if (res.isImage) {
      try {
        await fileToDataUrl(file);
      } catch {}
    }
    if (res.text) setText(res.text);
    if (res.note) setNote(res.note);
  }

  async function generate() {
    const content = text.trim();
    if (!content) {
      setNote("Add the notification text (paste or upload) before generating.");
      return;
    }
    setBusy(true);
    setStep(0);
    setNotification(assessment.id, {
      rawText: content,
      fileName: fileName || undefined,
      fileType: fileName ? fileName.split(".").pop() : "text",
      uploadedAt: Date.now(),
    });
    // Ground the AI in the real course syllabus + learning outcomes (from Canvas)
    // so summaries, notes, flashcards and tests follow the actual curriculum.
    const syllabusCtx: string[] = [];
    if (subject.syllabus && subject.syllabus.trim()) {
      syllabusCtx.push(`Course syllabus:\n${subject.syllabus.trim().slice(0, 3500)}`);
    }
    if (subject.outcomes && subject.outcomes.length) {
      syllabusCtx.push(
        "Course learning outcomes (syllabus standards):\n" +
          subject.outcomes
            .slice(0, 40)
            .map((o) => `- ${o.title}${o.description ? `: ${o.description}` : ""}`)
            .join("\n")
      );
    }
    // Fold in what the student researched in the in-app browser for this subject.
    const research = researchForSubject(useData.getState().data(), subject.id).slice(0, 12);
    if (research.length) {
      syllabusCtx.push(
        "Student's saved web research (use relevant facts in the notes/flashcards):\n" +
          research
            .map((r) =>
              r.kind === "view"
                ? `- ${r.title || r.url}${r.excerpt ? `: ${r.excerpt.slice(0, 600)}` : ""}`
                : `- searched: "${r.query}"`
            )
            .join("\n")
      );
    }
    const aiText = syllabusCtx.length
      ? `${content}\n\n=== Course context (use to align materials to the real syllabus) ===\n${syllabusCtx.join("\n\n")}`
      : content;
    try {
      const result = await ai.analyzeAssessment({
        subjectType: subject.type,
        subjectName: subject.name,
        assessmentTitle: assessment.title,
        text: aiText,
        kind: assessment.kind,
      });
      setGenerated(assessment.id, {
        summary: result.summary,
        notes: result.notes,
        revision: result.revision,
        generatedAt: Date.now(),
        model: ai.name,
      });
      // replace AI flashcards for this assessment
      addFlashcards(
        result.flashcards.map((f) => ({
          subjectId: subject.id,
          assessmentId: assessment.id,
          front: f.front,
          back: f.back,
          source: "ai" as const,
        }))
      );
      if (assessment.progress < 25) updateAssessment(assessment.id, { progress: 25 });
      if (result.summary.dueDate && !assessment.dueDate)
        updateAssessment(assessment.id, { dueDate: result.summary.dueDate });
      if (result.plan && result.plan.length && !assessment.steps?.length)
        updateAssessment(assessment.id, {
          steps: result.plan.map((t) => ({ id: uid(), text: t, done: false })),
        });
      setEditing(false);
      onGenerated?.();
    } finally {
      setBusy(false);
    }
  }

  if (showCompact) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-emerald-500/20 bg-emerald-500/[0.05] px-5 py-4">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-500/15">
          <Check size={18} className="text-emerald-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">Notification analysed</p>
          <p className="truncate text-[13px] text-ink-muted">
            {fileName || "Pasted text"} · materials generated and linked
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
          <RefreshCw size={14} /> Replace / regenerate
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-4xl border-2 border-dashed border-anchor/25 bg-gradient-to-b from-anchor/[0.04] to-transparent p-1.5">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "rounded-[26px] px-6 py-8 transition-colors sm:px-8",
          dragging && "bg-anchor/[0.06]"
        )}
      >
        <AnimatePresence mode="wait">
          {busy ? (
            <motion.div
              key="busy"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center py-8 text-center"
            >
              <div className="relative grid h-16 w-16 place-items-center">
                <span className="absolute inset-0 animate-spin rounded-full border-2 border-anchor/20 border-t-anchor" />
                <Sparkles size={24} className="text-anchor" />
              </div>
              <p className="mt-5 text-[15px] font-medium text-ink">{STEPS[step]}</p>
              <p className="mt-1 text-[13px] text-ink-muted">
                Anchor is turning your notification into a study hub.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex flex-col items-center text-center">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-anchor/10">
                  <Upload size={24} className="text-anchor" />
                </div>
                <h3 className="mt-4 text-xl font-semibold tracking-tight text-ink">
                  Upload Assessment Notification
                </h3>
                <p className="mt-1.5 max-w-md text-sm text-ink-muted">
                  Drop your assessment notification here — Anchor reads it and
                  generates your summary, notes, flashcards and practice tests.
                </p>

                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  <Button variant="primary" onClick={() => inputRef.current?.click()}>
                    <Upload size={16} /> Choose file
                  </Button>
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".pdf,.docx,.txt,.md,.rtf,.csv,image/*"
                    className="hidden"
                    onChange={(e) => handleFiles(e.target.files)}
                  />
                  <span className="text-[13px] text-ink-faint">or paste below</span>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[12px] text-ink-faint">
                  <Fmt icon={FileText} label="PDF" />
                  <Fmt icon={FileType2} label="DOCX" />
                  <Fmt icon={FileText} label="TXT" />
                  <Fmt icon={ImageIcon} label="Image" />
                  <Fmt icon={ClipboardPaste} label="Paste text" />
                </div>
              </div>

              {assessment.notification?.fileType === "canvas" && !hasGenerated && (
                <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-emerald-500/[0.08] px-4 py-2.5 text-[13px] text-emerald-700">
                  <Check size={14} /> Found on Canvas — review the brief below and click generate.
                </div>
              )}

              <div className="mt-6">
                {fileName && (
                  <div className="mb-2 flex items-center gap-2 text-[13px] text-ink-soft">
                    <FileText size={14} className="text-anchor" />
                    {fileName}
                    <button
                      onClick={() => {
                        setFileName("");
                        setText("");
                      }}
                      className="text-ink-faint hover:text-ink"
                    >
                      <X size={13} />
                    </button>
                  </div>
                )}
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste your assessment notification text here — task description, marking criteria, due date, outcomes…"
                  className="min-h-[140px] bg-white/70"
                />
                {note && (
                  <p className="mt-2 text-[13px] font-medium text-anchor-700">{note}</p>
                )}
                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-[12px] text-ink-faint">
                    {text.trim().length} characters
                  </p>
                  <div className="flex gap-2">
                    {editing && (
                      <Button variant="ghost" onClick={() => setEditing(false)}>
                        Cancel
                      </Button>
                    )}
                    <Button variant="primary" onClick={generate} disabled={!text.trim()}>
                      <Sparkles size={16} />
                      {hasGenerated ? "Regenerate materials" : "Generate study materials"}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Fmt({ icon: Icon, label }: { icon: typeof FileText; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon size={13} /> {label}
    </span>
  );
}
