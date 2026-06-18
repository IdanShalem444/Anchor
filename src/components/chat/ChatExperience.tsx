"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, MessageSquare, Trash2, Sparkles } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Label, Select } from "@/components/ui/Input";
import { Tag } from "@/components/ui/Badge";
import { ChatView } from "@/components/chat/ChatView";
import { EmptyState } from "@/components/ui/misc";
import { useData } from "@/store/data";
import { activeSubjects, assessmentsFor, subjectById } from "@/lib/selectors";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/cn";

export function ChatExperience() {
  const d = useData((s) => s.data());
  const createChat = useData((s) => s.createChat);
  const deleteChat = useData((s) => s.deleteChat);
  const subjects = activeSubjects(d);

  const [activeId, setActiveId] = useState<string | null>(d.chats[0]?.id ?? null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [subjectId, setSubjectId] = useState<string>("");
  const [assessmentId, setAssessmentId] = useState<string>("");

  const chats = [...d.chats].sort((a, b) => b.updatedAt - a.updatedAt);
  const active = chats.find((c) => c.id === activeId) ?? chats[0];

  useEffect(() => {
    if (!activeId && chats[0]) setActiveId(chats[0].id);
  }, [activeId, chats]);

  const pickerAssessments = subjectId ? assessmentsFor(d, subjectId) : [];

  function start() {
    const subject = subjectById(d, subjectId);
    const assessment = pickerAssessments.find((a) => a.id === assessmentId);
    const c = createChat({
      title: assessment ? `${assessment.title}` : subject ? `${subject.name} chat` : "New chat",
      subjectId: subjectId || undefined,
      assessmentId: assessmentId || undefined,
    });
    setActiveId(c.id);
    setPickerOpen(false);
    setSubjectId("");
    setAssessmentId("");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      {/* threads */}
      <GlassCard className="flex max-h-[620px] flex-col p-3">
        <Button variant="primary" className="w-full" onClick={() => setPickerOpen(true)}>
          <Plus size={16} /> New chat
        </Button>
        <div className="mt-3 flex-1 space-y-1 overflow-y-auto no-scrollbar">
          {chats.length === 0 ? (
            <p className="px-2 py-6 text-center text-[13px] text-ink-muted">
              No chats yet. Start one with a subject and assessment for tailored help.
            </p>
          ) : (
            chats.map((c) => {
              const subject = subjectById(d, c.subjectId);
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  className={cn(
                    "group flex w-full items-start gap-2 rounded-2xl px-3 py-2.5 text-left transition-colors",
                    active?.id === c.id ? "bg-white/70 shadow-soft" : "hover:bg-white/50"
                  )}
                >
                  <MessageSquare size={15} className="mt-0.5 shrink-0 text-ink-faint" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium text-ink">
                      {c.title}
                    </span>
                    <span className="flex items-center gap-1.5 text-[11px] text-ink-muted">
                      {subject && <Tag color={subject.color} label={subject.name} size="sm" />}
                      {relativeTime(c.updatedAt)}
                    </span>
                  </span>
                  <Trash2
                    size={13}
                    className="opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteChat(c.id);
                      if (active?.id === c.id) setActiveId(null);
                    }}
                  />
                </button>
              );
            })
          )}
        </div>
      </GlassCard>

      {/* conversation */}
      <GlassCard className="flex h-[620px] flex-col p-4 sm:p-5">
        {active ? (
          <ChatView chatId={active.id} />
        ) : (
          <div className="grid h-full place-items-center">
            <EmptyState
              icon={Sparkles}
              title="Your AI study tutor"
              description="Start a chat and link a subject and assessment — the tutor reads your notification and helps you prepare."
              action={
                <Button variant="primary" onClick={() => setPickerOpen(true)}>
                  <Plus size={16} /> New chat
                </Button>
              }
            />
          </div>
        )}
      </GlassCard>

      <Modal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="New chat"
        description="Link a subject and assessment so the tutor has full context."
        size="md"
      >
        <div className="space-y-4">
          <div>
            <Label>Subject (optional)</Label>
            <Select
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value);
                setAssessmentId("");
              }}
            >
              <option value="">No subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          {subjectId && (
            <div>
              <Label>Assessment (optional)</Label>
              <Select value={assessmentId} onChange={(e) => setAssessmentId(e.target.value)}>
                <option value="">Whole subject</option>
                {pickerAssessments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setPickerOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={start}>
              Start chat
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
