"use client";

import { ResearchPanel } from "@/components/research/ResearchPanel";

export default function SchoolResearchPage() {
  return (
    <div>
      <div className="pt-1">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Research</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Pick a subject, search the web, and read pages right here. With AI capture on,
          what you search and read feeds into your notes, flashcards and tutor.
        </p>
      </div>
      <div className="mt-6">
        <ResearchPanel />
      </div>
    </div>
  );
}
