"use client";

import { ChatExperience } from "@/components/chat/ChatExperience";

export default function SchoolTutorPage() {
  return (
    <div>
      <div className="pt-1">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">AI Tutor</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Pick a subject and assessment — your tutor already knows the notification.
        </p>
      </div>
      <div className="mt-6">
        <ChatExperience />
      </div>
    </div>
  );
}
