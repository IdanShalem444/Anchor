"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Send, Sparkles, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Badge";
import { useData } from "@/store/data";
import { ai } from "@/lib/ai";
import { subjectById, assessmentById } from "@/lib/selectors";
import { AnchorMark } from "@/components/brand/AnchorLogo";

const SUGGESTIONS = [
  "Help me plan my response",
  "Explain the key concepts",
  "Quiz me on this",
  "What are markers looking for?",
];

export function ChatView({ chatId }: { chatId: string }) {
  const d = useData((s) => s.data());
  const addMessage = useData((s) => s.addMessage);
  const renameChat = useData((s) => s.renameChat);
  const thread = d.chats.find((c) => c.id === chatId);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const subject = subjectById(d, thread?.subjectId);
  const assessment = assessmentById(d, thread?.assessmentId);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [thread?.messages.length, sending]);

  if (!thread) {
    return (
      <div className="grid h-full place-items-center text-sm text-ink-muted">
        Select or start a chat.
      </div>
    );
  }

  async function send(content: string) {
    const text = content.trim();
    if (!text || sending || !thread) return;
    setInput("");
    addMessage(thread.id, { role: "user", content: text });
    if (thread.messages.length === 0) {
      renameChat(thread.id, text.slice(0, 40));
    }
    setSending(true);
    const history = [
      ...thread.messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: text },
    ];
    // Give the tutor the student's assessments (this subject's, or all of them)
    // so it can answer "what's next / what's due / how am I going" directly.
    const pool = (subject
      ? d.assessments.filter((a) => a.subjectId === subject.id && !a.deletedAt)
      : d.assessments.filter((a) => !a.deletedAt)
    )
      .slice()
      .sort((x, y) => (x.dueDate || "9999-99-99").localeCompare(y.dueDate || "9999-99-99"))
      .slice(0, 30)
      .map((a) => ({
        title: a.title,
        subject: subjectById(d, a.subjectId)?.name,
        dueDate: a.dueDate || null,
        status: a.status,
        grade: a.result?.grade ?? (a.result?.score != null ? String(a.result.score) : null),
      }));
    const reply = await ai.chat({
      messages: history,
      context: {
        subject: subject ? { name: subject.name, type: subject.type } : undefined,
        assessmentTitle: assessment?.title,
        notificationText: assessment?.notification?.rawText,
        summary: assessment?.generated?.summary,
        today: new Date().toISOString().slice(0, 10),
        assessments: pool,
      },
    });
    addMessage(thread.id, { role: "assistant", content: reply });
    setSending(false);
  }

  return (
    <div className="flex h-full flex-col">
      {/* context bar */}
      {(subject || assessment) && (
        <div className="flex flex-wrap items-center gap-2 border-b border-black/[0.06] px-1 pb-3">
          <span className="text-[12px] text-ink-faint">Context</span>
          {subject && <Tag color={subject.color} label={subject.name} size="sm" />}
          {assessment && (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/[0.04] px-2 py-0.5 text-[11px] text-ink-soft">
              <FileText size={11} /> {assessment.title}
            </span>
          )}
          {assessment?.generated && (
            <span className="inline-flex items-center gap-1 text-[11px] text-anchor">
              <Sparkles size={11} /> knows your notification
            </span>
          )}
        </div>
      )}

      {/* messages */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-1 py-5 no-scrollbar">
        {thread.messages.length === 0 ? (
          <div className="grid h-full place-items-center text-center">
            <div>
              <AnchorMark size={32} className="mx-auto" />
              <p className="mt-3 text-[15px] font-medium text-ink">
                {assessment
                  ? `Ask anything about "${assessment.title}"`
                  : "Your AI study tutor"}
              </p>
              <p className="mx-auto mt-1 max-w-xs text-[13px] text-ink-muted">
                {assessment?.generated
                  ? "I've read your notification and generated materials — let's go deeper."
                  : "Plan, explain, draft and quiz — grounded in your subject and assessment."}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full bg-black/[0.04] px-3.5 py-2 text-[13px] text-ink-soft transition-colors hover:bg-black/[0.07]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          thread.messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={m.role === "user" ? "flex justify-end" : "flex gap-3"}
            >
              {m.role === "assistant" && (
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/70 ring-1 ring-black/[0.05]">
                  <AnchorMark size={16} />
                </span>
              )}
              <div
                className={
                  m.role === "user"
                    ? "max-w-[80%] whitespace-pre-wrap rounded-3xl rounded-br-lg bg-anchor px-4 py-2.5 text-[14px] leading-relaxed text-white"
                    : "max-w-[80%] whitespace-pre-wrap rounded-3xl rounded-bl-lg bg-white/70 px-4 py-2.5 text-[14px] leading-relaxed text-ink ring-1 ring-black/[0.04]"
                }
              >
                {m.content}
              </div>
            </motion.div>
          ))
        )}
        {sending && (
          <div className="flex gap-3">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/70 ring-1 ring-black/[0.05]">
              <AnchorMark size={16} />
            </span>
            <div className="flex items-center gap-1 rounded-3xl rounded-bl-lg bg-white/70 px-4 py-3.5 ring-1 ring-black/[0.04]">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-ink-faint"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* input */}
      <div className="border-t border-black/[0.06] pt-3">
        <div className="flex items-end gap-2 rounded-3xl bg-white/70 p-2 ring-1 ring-black/[0.05]">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder="Message your tutor…"
            className="max-h-32 flex-1 resize-none bg-transparent px-3 py-2 text-[14px] text-ink placeholder:text-ink-faint focus:outline-none"
          />
          <Button
            size="icon"
            variant="primary"
            disabled={!input.trim() || sending}
            onClick={() => send(input)}
            className="rounded-2xl"
          >
            <Send size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
