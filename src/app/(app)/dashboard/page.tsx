"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Plus,
  Bell,
  StickyNote,
  FolderKanban,
  MessageSquare,
  Flame,
  CalendarDays,
  ArrowUpRight,
  Sparkles,
  GraduationCap,
  CheckCircle2,
  Clock,
  Wand2,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Tag, Badge } from "@/components/ui/Badge";
import { ProgressRing, ProgressBar, SectionHeading } from "@/components/ui/misc";
import { useCurrentUser } from "@/store/auth";
import { useData } from "@/store/data";
import {
  activeSubjects,
  upcomingAssessments,
  dueThisWeek,
  subjectProgress,
  personalRemindersActive,
  readiness,
  assessmentCounts,
} from "@/lib/selectors";
import { SUBJECT_ICON } from "@/lib/subjectMeta";
import { greeting, formatDate, dueLabel, relativeTime } from "@/lib/format";

const QUICK = [
  { label: "Add subject", icon: GraduationCap, href: "/school/subjects?new=1" },
  { label: "Add reminder", icon: Bell, href: "/personal/reminders?new=1" },
  { label: "Add note", icon: StickyNote, href: "/personal/notes?new=1" },
  { label: "Add project", icon: FolderKanban, href: "/personal/projects?new=1" },
  { label: "Start AI chat", icon: MessageSquare, href: "/chat" },
];

export default function DashboardPage() {
  const user = useCurrentUser();
  const d = useData((s) => s.data());
  const seedExample = useData((s) => s.seedExample);

  const subjects = activeSubjects(d);
  const upcoming = upcomingAssessments(d).slice(0, 5);
  const thisWeek = dueThisWeek(d);
  const reminders = personalRemindersActive(d);
  const firstName = user?.name.split(" ")[0] ?? "there";
  const completed = d.assessments.filter((a) => a.status === "completed" && !a.deletedAt).length;

  return (
    <div className="mx-auto max-w-6xl px-6 pb-24">
      {/* header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-wrap items-end justify-between gap-4 pt-2"
      >
        <div>
          <p className="text-sm text-ink-muted">{formatDate(new Date().toISOString(), { weekday: "long" })}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink sm:text-[34px]">
            {greeting()}, {firstName}.
          </h1>
        </div>
        <div className="flex items-center gap-2.5 rounded-full bg-white/60 px-4 py-2 shadow-soft ring-1 ring-black/[0.04]">
          <Flame size={17} className="text-anchor" />
          <span className="text-sm font-semibold text-ink">
            {d.streak.count} day{d.streak.count === 1 ? "" : "s"}
          </span>
          <span className="text-sm text-ink-muted">streak</span>
        </div>
      </motion.div>

      {/* quick actions */}
      <div className="no-scrollbar mt-6 flex gap-2.5 overflow-x-auto pb-1">
        {QUICK.map((q) => (
          <Link key={q.label} href={q.href} className="shrink-0">
            <GlassCard
              interactive
              className="flex items-center gap-2.5 rounded-2xl px-4 py-3"
            >
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-anchor/10">
                <q.icon size={16} className="text-anchor" />
              </span>
              <span className="whitespace-nowrap text-sm font-medium text-ink">
                {q.label}
              </span>
            </GlassCard>
          </Link>
        ))}
      </div>

      {subjects.length === 0 ? (
        <FirstRun onSeed={seedExample} />
      ) : (
        <div className="mt-7 grid gap-5 lg:grid-cols-3">
          {/* main column */}
          <div className="space-y-5 lg:col-span-2">
            {/* this week */}
            <GlassCard className="p-6">
              <SectionHeading
                title="This week"
                subtitle="Assessments and reminders due in the next 7 days"
              />
              {thisWeek.length === 0 && reminders.filter((r) => r.dueDate).length === 0 ? (
                <div className="flex items-center gap-3 rounded-2xl bg-emerald-500/[0.07] px-4 py-4 text-sm text-emerald-700">
                  <CheckCircle2 size={18} />
                  Nothing urgent this week. A calm, anchored week ahead.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {thisWeek.map((a) => {
                    const subject = subjects.find((s) => s.id === a.subjectId);
                    return (
                      <Link
                        key={a.id}
                        href={`/school/subjects/${a.subjectId}/${a.id}`}
                        className="flex items-center gap-3 rounded-2xl bg-black/[0.02] px-4 py-3 transition-colors hover:bg-black/[0.04]"
                      >
                        <Clock size={16} className="shrink-0 text-anchor" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink">{a.title}</p>
                          {subject && (
                            <Tag color={subject.color} label={subject.name} size="sm" />
                          )}
                        </div>
                        <span className="shrink-0 text-[13px] font-medium text-anchor">
                          {dueLabel(a.dueDate)}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </GlassCard>

            {/* upcoming assessments */}
            <GlassCard className="p-6">
              <SectionHeading
                title="Upcoming assessments"
                action={
                  <Link href="/school/reminders" className="text-[13px] font-medium text-anchor hover:underline">
                    View all
                  </Link>
                }
              />
              {upcoming.length === 0 ? (
                <p className="py-6 text-center text-sm text-ink-muted">
                  No assessments with due dates yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {upcoming.map((a) => {
                    const subject = subjects.find((s) => s.id === a.subjectId);
                    const r = readiness(a);
                    const counts = assessmentCounts(d, a.id);
                    return (
                      <Link
                        key={a.id}
                        href={`/school/subjects/${a.subjectId}/${a.id}`}
                        className="flex items-center gap-4 rounded-2xl border border-black/[0.05] px-4 py-3 transition-all hover:border-black/[0.1] hover:shadow-soft"
                      >
                        <ProgressRing value={r.pct} size={46} color={a.color}>
                          {r.pct}
                        </ProgressRing>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink">{a.title}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            {subject && <Tag color={subject.color} label={subject.name} size="sm" />}
                            <Badge tone={r.tone === "neutral" ? "neutral" : r.tone}>{r.label}</Badge>
                            {counts.flashcards > 0 && (
                              <span className="text-[11px] text-ink-faint">{counts.flashcards} cards</span>
                            )}
                          </div>
                        </div>
                        <span className="shrink-0 text-[13px] text-ink-muted">{dueLabel(a.dueDate)}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </GlassCard>
          </div>

          {/* side column */}
          <div className="space-y-5">
            {/* stats */}
            <GlassCard className="p-6">
              <h3 className="text-[15px] font-semibold text-ink">Overview</h3>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Stat label="Subjects" value={subjects.length} icon={GraduationCap} />
                <Stat label="Assessments" value={d.assessments.filter((a) => !a.deletedAt).length} icon={CalendarDays} />
                <Stat label="Completed" value={completed} icon={CheckCircle2} />
                <Stat label="Flashcards" value={d.flashcards.length} icon={Sparkles} />
              </div>
            </GlassCard>

            {/* subject progress */}
            <GlassCard className="p-6">
              <h3 className="mb-4 text-[15px] font-semibold text-ink">Subject progress</h3>
              <div className="space-y-4">
                {subjects.slice(0, 6).map((s) => {
                  const Icon = SUBJECT_ICON[s.type];
                  const p = subjectProgress(d, s.id);
                  return (
                    <Link key={s.id} href={`/school/subjects/${s.id}`} className="block">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-2 text-sm font-medium text-ink">
                          <Icon size={15} style={{ color: s.color }} />
                          {s.name}
                        </span>
                        <span className="text-xs text-ink-muted">{p}%</span>
                      </div>
                      <ProgressBar value={p} color={s.color} />
                    </Link>
                  );
                })}
              </div>
            </GlassCard>

            {/* recent activity */}
            <RecentActivity />
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof GraduationCap;
}) {
  return (
    <div className="rounded-2xl bg-black/[0.03] p-3.5">
      <Icon size={16} className="text-ink-faint" />
      <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">{value}</p>
      <p className="text-[12px] text-ink-muted">{label}</p>
    </div>
  );
}

function RecentActivity() {
  const d = useData((s) => s.data());
  const items = [
    ...d.chats.map((c) => ({ id: c.id, label: c.title, sub: "Chat", ts: c.updatedAt, href: `/chat?c=${c.id}` })),
    ...d.notes
      .filter((n) => !n.deletedAt)
      .map((n) => ({ id: n.id, label: n.title || "Untitled note", sub: "Note", ts: n.updatedAt, href: `/personal/notes?id=${n.id}` })),
    ...d.assessments
      .filter((a) => !a.deletedAt && a.generated)
      .map((a) => ({ id: a.id, label: a.title, sub: "Materials generated", ts: a.generated!.generatedAt, href: `/school/subjects/${a.subjectId}/${a.id}` })),
  ]
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 5);

  return (
    <GlassCard className="p-6">
      <h3 className="mb-4 text-[15px] font-semibold text-ink">Recent activity</h3>
      {items.length === 0 ? (
        <p className="text-sm text-ink-muted">Your recent work will appear here.</p>
      ) : (
        <div className="space-y-1">
          {items.map((it) => (
            <Link
              key={it.id + it.sub}
              href={it.href}
              className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-black/[0.04]"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{it.label}</p>
                <p className="text-[12px] text-ink-muted">{it.sub} · {relativeTime(it.ts)}</p>
              </div>
              <ArrowUpRight size={14} className="text-ink-faint" />
            </Link>
          ))}
        </div>
      )}
    </GlassCard>
  );
}

function FirstRun({ onSeed }: { onSeed: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="mt-7"
    >
      <GlassCard className="relative overflow-hidden p-10">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-aurora-orange blur-2xl" />
        <div className="relative max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-anchor/10 px-3 py-1.5 text-[12.5px] font-medium text-anchor-700">
            <Sparkles size={13} /> Let's get you anchored
          </div>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
            Start with your first subject
          </h2>
          <p className="mt-2 text-ink-muted">
            Create a subject, add an assessment, then upload its notification —
            Anchor will generate your summary, study notes, flashcards and
            practice tests automatically.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/school/subjects?new=1">
              <Button variant="primary" size="lg">
                <Plus size={17} /> Create a subject
              </Button>
            </Link>
            <Button variant="secondary" size="lg" onClick={onSeed}>
              <Wand2 size={16} /> Add a sample subject
            </Button>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}
