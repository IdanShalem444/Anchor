"use client";

import { ChatExperience } from "@/components/chat/ChatExperience";

export default function ChatPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 pb-24">
      <div className="pt-1">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">AI Tutor</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Contextual chats grounded in your subjects and assessments — saved like ChatGPT.
        </p>
      </div>
      <div className="mt-6">
        <ChatExperience />
      </div>
    </div>
  );
}
