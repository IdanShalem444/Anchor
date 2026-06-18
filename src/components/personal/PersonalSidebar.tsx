"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { StickyNote, Bell, FolderKanban, Network, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

const NAV: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Notes", href: "/personal/notes", icon: StickyNote },
  { label: "Reminders", href: "/personal/reminders", icon: Bell },
  { label: "Projects", href: "/personal/projects", icon: FolderKanban },
  { label: "Planning", href: "/personal/planning", icon: Network },
];

export function PersonalSidebar() {
  const pathname = usePathname() || "";
  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <aside className="lg:w-56 lg:shrink-0">
      <div className="sticky top-[88px] hidden lg:block">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
          Personal
        </p>
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
                <item.icon size={16} className={active ? "text-anchor" : "text-ink-faint"} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

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
