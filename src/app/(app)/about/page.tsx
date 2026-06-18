"use client";

import { motion } from "framer-motion";
import {
  Anchor as AnchorIcon,
  GraduationCap,
  Bell,
  FileText,
  FolderKanban,
  Sparkles,
  Link2,
} from "lucide-react";
import { AnchorMark } from "@/components/brand/AnchorLogo";
import { GlassCard } from "@/components/ui/GlassCard";

const PILLARS = [
  { icon: GraduationCap, title: "Education, organised", body: "Every subject is a workspace. Assessments, notes, flashcards and tests live together and link automatically by colour." },
  { icon: FileText, title: "Assessment preparation", body: "Upload a notification and Anchor extracts the requirements, dates and outcomes, then builds your study plan." },
  { icon: Sparkles, title: "AI assistance", body: "An AI tutor that already understands your assessment — no re-explaining. Plan, draft, revise and self-test." },
  { icon: Bell, title: "Personal organisation", body: "Reminders that actually surface, notes that schedule themselves, and a calm home for everything else." },
  { icon: FolderKanban, title: "Project management", body: "Creative project workspaces for ideas, art and plans — tasks, milestones, links and a writing space." },
  { icon: Link2, title: "Everything connected", body: "Subjects, assessments, chats, flashcards and reminders share one tagging system. Nothing lives in isolation." },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 pb-24">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="pt-4 text-center"
      >
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl glass">
          <AnchorMark size={32} />
        </div>
        <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Why Anchor exists
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-balance text-lg leading-relaxed text-ink-muted">
          Students juggle assignments across every subject with no notes, no practice tests,
          and no single place to keep it together. Reminders live in one app, notes in another,
          and assessment details get lost entirely. Anchor brings all of it into one calm,
          connected workspace.
        </p>
      </motion.div>

      <GlassCard className="relative mt-12 overflow-hidden p-8 sm:p-10">
        <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-aurora-blue blur-2xl" />
        <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-anchor/10">
            <AnchorIcon size={26} className="text-anchor" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-ink">The anchor metaphor</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
              An anchor keeps a ship stable, secure and grounded — no matter the conditions.
              Anchor does the same for your study and your life. When assessments pile up and
              everything feels scattered, it holds your work steady in one place so you stay
              calm, organised and prepared.
            </p>
          </div>
        </div>
      </GlassCard>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {PILLARS.map((p, i) => (
          <motion.div
            key={p.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.45, delay: i * 0.04 }}
          >
            <GlassCard className="h-full p-6">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-anchor/10">
                <p.icon size={20} className="text-anchor" strokeWidth={1.8} />
              </div>
              <h3 className="mt-4 text-[16px] font-semibold text-ink">{p.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{p.body}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <div className="mt-12 text-center">
        <h2 className="text-balance text-2xl font-semibold tracking-tight text-ink">
          One place where everything lives
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-ink-muted">
          School and personal, study and life — anchored together, beautifully organised,
          and always within reach.
        </p>
      </div>
    </div>
  );
}
