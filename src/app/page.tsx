"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Sparkles,
  Bell,
  FolderKanban,
  Network,
  Upload,
  ArrowRight,
} from "lucide-react";
import { AnchorMark, AnchorLogo } from "@/components/brand/AnchorLogo";
import { AuthCard } from "@/components/auth/AuthCard";
import { GlassCard } from "@/components/ui/GlassCard";
import { useAuth, useCurrentUser } from "@/store/auth";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useMounted } from "@/lib/hooks";

const FEATURES = [
  {
    icon: Upload,
    title: "Upload an assessment",
    body: "Drop in a notification — PDF, Word, or pasted text — and Anchor reads it for you.",
  },
  {
    icon: Sparkles,
    title: "AI generates everything",
    body: "Summaries, study notes, a revision hub, flashcards and practice tests, instantly.",
  },
  {
    icon: GraduationCap,
    title: "Every subject, organised",
    body: "Colour-coded subjects and assessments, all linked like a Notion built for school.",
  },
  {
    icon: Bell,
    title: "Reminders that surface",
    body: "Due-soon assessments appear on your dashboard and in reminders, never missed.",
  },
  {
    icon: FolderKanban,
    title: "Personal projects",
    body: "Creative workspaces for ideas, art, builds and plans — with files and tasks.",
  },
  {
    icon: Network,
    title: "Visual planning",
    body: "An infinite whiteboard for mind maps, sticky notes and connected thinking.",
  },
];

export default function Landing() {
  const user = useCurrentUser();
  const sessionResolved = useAuth((s) => s.sessionResolved);
  const mounted = useMounted();
  const router = useRouter();

  useEffect(() => {
    if (mounted && user) router.replace("/dashboard");
  }, [mounted, user, router]);

  if (!mounted || user || (isSupabaseConfigured && !sessionResolved)) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <AnchorMark size={40} className="animate-pulse-soft" />
      </div>
    );
  }

  return (
    <main className="relative">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <AnchorLogo />
        <a
          href="#features"
          className="rounded-full px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-black/[0.04] hover:text-ink"
        >
          Explore
        </a>
      </header>

      {/* hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1.5 text-[12.5px] font-medium text-ink-soft shadow-soft ring-1 ring-black/[0.04]">
            <Sparkles size={13} className="text-anchor" />
            Study, organisation and AI — anchored in one place
          </div>
          <h1 className="mt-6 text-balance text-5xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-6xl">
            Everything you study,{" "}
            <span className="text-anchor">anchored.</span>
          </h1>
          <p className="mt-5 max-w-md text-balance text-lg leading-relaxed text-ink-muted">
            An anchor keeps a ship steady in any conditions. Anchor keeps your
            assessments, notes, reminders, projects and plans steady — calm,
            connected, and always within reach.
          </p>
          <ul className="mt-7 space-y-2.5">
            {[
              "Upload an assessment, get notes & tests in seconds",
              "An AI tutor that already knows your task",
              "School and personal life, one quiet workspace",
            ].map((t) => (
              <li key={t} className="flex items-center gap-3 text-[15px] text-ink-soft">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-anchor/10">
                  <ArrowRight size={12} className="text-anchor" />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <AuthCard />
        </motion.div>
      </section>

      {/* features */}
      <section id="features" className="mx-auto max-w-6xl px-6 pb-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            One workspace for school and life
          </h2>
          <p className="mt-3 text-ink-muted">
            Anchor brings together the best of a study assistant, a notes app, a
            project manager and an AI tutor — without the clutter.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
            >
              <GlassCard interactive className="h-full p-6">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-anchor/10">
                  <f.icon className="text-anchor" size={20} strokeWidth={1.8} />
                </div>
                <h3 className="mt-4 text-[16px] font-semibold text-ink">
                  {f.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                  {f.body}
                </p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="border-t border-black/[0.06] py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <AnchorLogo size={18} />
          <p className="text-[13px] text-ink-faint">
            Anchor — keep your education and life grounded in one place.
          </p>
        </div>
      </footer>
    </main>
  );
}
