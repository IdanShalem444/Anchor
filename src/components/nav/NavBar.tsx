"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  Menu,
  X,
  Settings,
  LogOut,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { AnchorMark } from "@/components/brand/AnchorLogo";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { GlobalSearch } from "@/components/GlobalSearch";
import { useAuth, useCurrentUser } from "@/store/auth";
import { cn } from "@/lib/cn";

const LINKS = [
  { label: "About", href: "/about", match: (p: string) => p === "/about" },
  { label: "Work", href: "/school", match: (p: string) => p.startsWith("/school") },
  { label: "Personal", href: "/personal", match: (p: string) => p.startsWith("/personal") },
  { label: "Chat", href: "/chat", match: (p: string) => p.startsWith("/chat") },
];

export function NavBar() {
  const pathname = usePathname() || "";
  const router = useRouter();
  const user = useCurrentUser();
  const signOut = useAuth((s) => s.signOut);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
        <nav className="glass-strong pointer-events-auto flex w-full max-w-3xl items-center gap-1 rounded-full px-2.5 py-2 shadow-glass">
          <Link
            href="/dashboard"
            className="flex shrink-0 items-center gap-2 rounded-full px-2 py-1 transition-transform hover:scale-[1.03]"
          >
            <span className="grid h-7 w-7 place-items-center rounded-full bg-white/70 ring-1 ring-black/[0.04]">
              <AnchorMark size={18} />
            </span>
            <span className="hidden text-[15px] font-semibold tracking-tight sm:block">
              Anchor
            </span>
          </Link>

          <div className="mx-1 hidden h-5 w-px bg-black/[0.07] sm:block" />

          {/* desktop links */}
          <div className="hidden flex-1 items-center gap-0.5 sm:flex">
            {LINKS.map((l) => {
              const active = l.match(pathname);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "relative rounded-full px-3.5 py-1.5 text-[13.5px] font-medium transition-colors",
                    active ? "text-anchor" : "text-ink-soft hover:text-ink"
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-full bg-anchor/10"
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    />
                  )}
                  <span className="relative">{l.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="flex-1 sm:hidden" />

          {/* search */}
          <button
            onClick={() => setSearchOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-full text-ink-soft transition-colors hover:bg-black/[0.05] hover:text-ink"
            aria-label="Search"
          >
            <Search size={18} />
          </button>

          {/* account */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setAccountOpen((v) => !v)}
                className="flex items-center gap-1 rounded-full p-0.5 transition-transform hover:scale-[1.04]"
                aria-label="Account menu"
              >
                <Avatar name={user.name} src={user.avatarUrl} size={32} />
                <ChevronDown
                  size={14}
                  className={cn(
                    "mr-1 hidden text-ink-faint transition-transform sm:block",
                    accountOpen && "rotate-180"
                  )}
                />
              </button>
              <AnimatePresence>
                {accountOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setAccountOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96, y: -6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97, y: -4 }}
                      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      className="glass-strong absolute right-0 top-12 z-20 w-60 rounded-3xl p-2 shadow-glass"
                    >
                      <div className="flex items-center gap-3 rounded-2xl px-3 py-2.5">
                        <Avatar name={user.name} src={user.avatarUrl} size={38} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{user.name}</p>
                          <p className="truncate text-xs text-ink-muted">{user.email}</p>
                        </div>
                      </div>
                      <div className="px-3 pb-2">
                        <Badge tone={user.plan === "pro" ? "anchor" : "neutral"}>
                          {user.plan === "pro" && <Sparkles size={11} />}
                          {user.plan[0].toUpperCase() + user.plan.slice(1)} plan
                        </Badge>
                      </div>
                      <div className="my-1 h-px bg-black/[0.06]" />
                      <MenuItem
                        icon={Settings}
                        label="Account & settings"
                        onClick={() => {
                          setAccountOpen(false);
                          router.push("/account");
                        }}
                      />
                      <MenuItem
                        icon={Sparkles}
                        label="Plans & billing"
                        onClick={() => {
                          setAccountOpen(false);
                          router.push("/account/plans");
                        }}
                      />
                      <MenuItem
                        icon={LogOut}
                        label="Sign out"
                        danger
                        onClick={() => {
                          setAccountOpen(false);
                          signOut();
                          router.push("/");
                        }}
                      />
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* mobile menu button */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-full text-ink-soft transition-colors hover:bg-black/[0.05] sm:hidden"
            aria-label="Menu"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </nav>
      </div>

      {/* mobile dropdown */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="fixed inset-x-4 top-20 z-40 sm:hidden"
          >
            <div className="glass-strong rounded-3xl p-2 shadow-glass">
              {LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "block rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
                    l.match(pathname)
                      ? "bg-anchor/10 text-anchor"
                      : "text-ink-soft hover:bg-black/[0.04]"
                  )}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof Settings;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors",
        danger
          ? "text-red-600 hover:bg-red-500/10"
          : "text-ink-soft hover:bg-black/[0.04] hover:text-ink"
      )}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}
