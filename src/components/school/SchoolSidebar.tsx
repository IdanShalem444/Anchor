"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GraduationCap,
  FileText,
  Sparkles,
  Layers,
  ClipboardCheck,
  NotebookPen,
  CalendarRange,
  Paperclip,
  Table2,
  Globe,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { useData } from "@/store/data";
import { activeSubjects } from "@/lib/selectors";
import { SUBJECT_ICON } from "@/lib/subjectMeta";
import { Dot } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";

const NAV: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Subjects", href: "/school/subjects", icon: GraduationCap },
  { label: "Assessments", href: "/school/assessments", icon: FileText },
  { label: "AI Tutor", href: "/school/tutor", icon: Sparkles },
  { label: "Research", href: "/school/research", icon: Globe },
  { label: "Flashcards", href: "/school/flashcards", icon: Layers },
  { label: "Tests", href: "/school/tests", icon: ClipboardCheck },
  { label: "Revision", href: "/school/revision", icon: NotebookPen },
  { label: "Yearly Review", href: "/school/yearly", icon: CalendarRange },
  { label: "Resources", href: "/school/resources", icon: Paperclip },
  { label: "Reminders", href: "/school/reminders", icon: Table2 },
];

export function SchoolSidebar() {
  const pathname = usePathname() || "";
  const subjects = useData((s) => activeSubjects(s.data()));

  const isActive = (href: string) =>
    href === "/school/subjects"
      ? pathname === "/school" || pathname.startsWith("/school/subjects")
      : pathname.startsWith(href);

  return (
    <aside className="lg:w-60 lg:shrink-0">
      {/* desktop */}
      <div className="sticky top-[88px] hidden max-h-[calc(100dvh-104px)] flex-col overflow-y-auto no-scrollbar lg:flex">
        <div className="px-2 pb-2">
          <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            School
          </p>
        </div>
        <nav className="space-y-0.5">
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-2 text-[13.5px] font-medium transition-colors",
                  active
                    ? "bg-white/70 text-ink shadow-soft ring-1 ring-black/[0.04]"
                    : "text-ink-soft hover:bg-white/50 hover:text-ink"
                )}
              >
                <item.icon
                  size={16}
                  className={active ? "text-anchor" : "text-ink-faint"}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-5 px-2">
          <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            My subjects
          </p>
        </div>
        <div className="mt-1 space-y-0.5">
          {subjects.map((s) => {
            const Icon = SUBJECT_ICON[s.type];
            const active = pathname.includes(`/subjects/${s.id}`);
            return (
              <Link
                key={s.id}
                href={`/school/subjects/${s.id}`}
                className={cn(
                  "flex items-center gap-2.5 rounded-2xl px-3 py-2 text-[13.5px] transition-colors",
                  active ? "bg-white/70 font-medium text-ink shadow-soft" : "text-ink-soft hover:bg-white/50"
                )}
              >
                <Icon size={15} style={{ color: s.color }} />
                <span className="truncate">{s.name}</span>
              </Link>
            );
          })}
          <Link
            href="/school/subjects?new=1"
            className="flex items-center gap-2.5 rounded-2xl px-3 py-2 text-[13.5px] text-ink-muted transition-colors hover:bg-white/50 hover:text-ink"
          >
            <Plus size={15} />
            New subject
          </Link>
        </div>
      </div>

      {/* mobile: horizontal scroller */}
      <div className="no-scrollbar -mx-6 flex gap-2 overflow-x-auto px-6 pb-2 lg:hidden">
        {NAV.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors",
                active ? "bg-anchor/10 text-anchor" : "glass text-ink-soft"
              )}
            >
              <item.icon size={15} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
