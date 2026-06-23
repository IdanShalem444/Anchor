"use client";

import type { LucideIcon } from "lucide-react";
import { useMounted } from "@/lib/hooks";
import { useCurrentUser } from "@/store/auth";

/** Shared compact shell for desktop widget windows (chrome-less, full height). */
export function WidgetFrame({
  icon: Icon,
  title,
  right,
  requireAuth = true,
  children,
}: {
  icon: LucideIcon;
  title: string;
  right?: React.ReactNode;
  requireAuth?: boolean;
  children: React.ReactNode;
}) {
  const mounted = useMounted();
  const user = useCurrentUser();

  if (!mounted) return null;
  if (requireAuth && !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6 text-center">
        <p className="text-sm text-ink-muted">
          Open Anchor and sign in to use this widget.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon size={18} className="text-anchor" />
        <h1 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h1>
        {right && <div className="ml-auto">{right}</div>}
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
