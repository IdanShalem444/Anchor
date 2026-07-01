"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Plus,
  Shuffle,
  Check,
  RotateCw,
  Trash2,
  Sparkles,
  Layers,
  Play,
  Pause,
  TimerReset,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { EmptyState, SegmentedControl, ProgressBar } from "@/components/ui/misc";
import { useData } from "@/store/data";
import { ai } from "@/lib/ai";
import type { Assessment, Flashcard, Subject } from "@/lib/types";

export function FlashcardsView({
  cards,
  subject,
  assessment,
}: {
  cards: Flashcard[];
  subject?: Subject;
  assessment?: Assessment;
}) {
  const [mode, setMode] = useState<"study" | "manage">("study");

  if (cards.length === 0) {
    return (
      <EmptyState
        icon={Layers}
        title="No flashcards yet"
        description={
          assessment
            ? "Upload the assessment notification to auto-generate flashcards, or add your own below."
            : "Flashcards generated from your assessments will appear here."
        }
        action={
          subject && assessment ? (
            <AddAndGenerate subject={subject} assessment={assessment} />
          ) : undefined
        }
      />
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <SegmentedControl
          options={[
            { value: "study", label: "Study" },
            { value: "manage", label: "Manage" },
          ]}
          value={mode}
          onChange={setMode}
        />
        {subject && assessment && <AddAndGenerate subject={subject} assessment={assessment} compact />}
      </div>
      {mode === "study" ? (
        <StudyMode cards={cards} />
      ) : (
        <ManageMode cards={cards} />
      )}
    </div>
  );
}

function StudyMode({ cards }: { cards: Flashcard[] }) {
  const toggleKnown = useData((s) => s.toggleKnown);
  const [order, setOrder] = useState(() => cards.map((_, i) => i));
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // Rehearsal timer — time yourself flipping through cue cards / a talk.
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running]);
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  const idx = order[Math.min(pos, order.length - 1)] ?? 0;
  const card = cards[idx];
  const known = cards.filter((c) => c.known).length;

  function next() {
    setFlipped(false);
    setPos((p) => (p + 1) % cards.length);
  }
  function shuffle() {
    setOrder([...Array(cards.length).keys()].sort(() => Math.random() - 0.5));
    setPos(0);
    setFlipped(false);
  }

  if (!card) return null;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-[13px] text-ink-muted">
        <span>
          Card {pos + 1} of {cards.length}
        </span>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.04] px-2 py-1 tabular-nums">
            <button
              onClick={() => setRunning((r) => !r)}
              className="text-ink-soft hover:text-ink"
              title={running ? "Pause" : "Rehearse — start the timer"}
            >
              {running ? <Pause size={13} /> : <Play size={13} />}
            </button>
            <span className="font-medium text-ink">{clock}</span>
            <button
              onClick={() => {
                setSeconds(0);
                setRunning(false);
              }}
              className="text-ink-faint hover:text-ink"
              title="Reset timer"
            >
              <TimerReset size={13} />
            </button>
          </div>
          <span>{known} mastered</span>
        </div>
      </div>
      <ProgressBar value={(known / cards.length) * 100} className="mb-4" />
      <div className="relative h-64 [perspective:1600px]">
        <AnimatePresence mode="wait">
          <motion.button
            key={card.id + (flipped ? "b" : "f")}
            onClick={() => setFlipped((f) => !f)}
            initial={{ opacity: 0, rotateY: -12, y: 10 }}
            animate={{ opacity: 1, rotateY: 0, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="glass-strong absolute inset-0 flex flex-col items-center justify-center rounded-3xl px-8 text-center"
          >
            <span className="absolute left-5 top-4 text-[11px] font-medium uppercase tracking-wider text-ink-faint">
              {flipped ? "Answer" : "Question"}
            </span>
            <p className="text-balance text-lg font-medium leading-relaxed text-ink">
              {flipped ? card.back : card.front}
            </p>
            <span className="absolute bottom-4 text-[12px] text-ink-faint">
              Tap to flip
            </span>
          </motion.button>
        </AnimatePresence>
      </div>
      <div className="mt-5 flex items-center justify-center gap-2">
        <Button variant="ghost" onClick={shuffle}>
          <Shuffle size={15} /> Shuffle
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            toggleKnown(card.id);
            next();
          }}
        >
          <Check size={15} className={card.known ? "text-emerald-600" : ""} />
          {card.known ? "Mastered" : "Got it"}
        </Button>
        <Button variant="primary" onClick={next}>
          Next <RotateCw size={15} />
        </Button>
      </div>
    </div>
  );
}

function ManageMode({ cards }: { cards: Flashcard[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {cards.map((c) => (
        <EditableCard key={c.id} card={c} />
      ))}
    </div>
  );
}

function EditableCard({ card }: { card: Flashcard }) {
  const update = useData((s) => s.updateFlashcard);
  const del = useData((s) => s.deleteFlashcard);
  const [front, setFront] = useState(card.front);
  const [back, setBack] = useState(card.back);

  return (
    <div className="rounded-3xl border border-black/[0.06] bg-white/60 p-4">
      <Input
        value={front}
        onChange={(e) => setFront(e.target.value)}
        onBlur={() => update(card.id, { front })}
        className="mb-2 font-medium"
      />
      <Textarea
        value={back}
        onChange={(e) => setBack(e.target.value)}
        onBlur={() => update(card.id, { back })}
        className="min-h-[70px] text-[13px]"
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] text-ink-faint">
          {card.source === "ai" ? "AI generated" : "Manual"}
        </span>
        <button
          onClick={() => del(card.id)}
          className="text-ink-faint transition-colors hover:text-red-600"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

function AddAndGenerate({
  subject,
  assessment,
  compact,
}: {
  subject: Subject;
  assessment: Assessment;
  compact?: boolean;
}) {
  const addFlashcard = useData((s) => s.addFlashcard);
  const addFlashcards = useData((s) => s.addFlashcards);
  const [open, setOpen] = useState(false);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [busy, setBusy] = useState(false);

  async function generateMore() {
    if (!assessment.notification?.rawText) return;
    setBusy(true);
    try {
      const more = await ai.generateFlashcards({
        subjectType: subject.type,
        subjectName: subject.name,
        assessmentTitle: assessment.title,
        text: assessment.notification.rawText,
        count: 6,
      });
      addFlashcards(
        more.map((f) => ({
          subjectId: subject.id,
          assessmentId: assessment.id,
          front: f.front,
          back: f.back,
          source: "ai" as const,
        }))
      );
    } catch {
      // Plan block handled by the global upgrade modal.
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={compact ? "flex gap-2" : "flex flex-wrap justify-center gap-2"}>
      {assessment.notification?.rawText && (
        <Button size="sm" variant="secondary" onClick={generateMore} disabled={busy}>
          <Sparkles size={14} /> {busy ? "Generating…" : "Generate more"}
        </Button>
      )}
      <Button size="sm" variant={compact ? "ghost" : "primary"} onClick={() => setOpen((v) => !v)}>
        <Plus size={14} /> Add card
      </Button>
      {open && (
        <div className="mt-2 w-full rounded-3xl border border-black/[0.06] bg-white/70 p-4">
          <Input
            value={front}
            onChange={(e) => setFront(e.target.value)}
            placeholder="Front (question)"
            className="mb-2"
          />
          <Textarea
            value={back}
            onChange={(e) => setBack(e.target.value)}
            placeholder="Back (answer)"
            className="min-h-[70px]"
          />
          <div className="mt-2 flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="primary"
              disabled={!front.trim() || !back.trim()}
              onClick={() => {
                addFlashcard({
                  subjectId: subject.id,
                  assessmentId: assessment.id,
                  front: front.trim(),
                  back: back.trim(),
                  source: "manual",
                });
                setFront("");
                setBack("");
                setOpen(false);
              }}
            >
              Add
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
