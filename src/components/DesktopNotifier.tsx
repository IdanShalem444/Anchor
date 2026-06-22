"use client";

import { useEffect } from "react";
import { useData } from "@/store/data";
import { personalRemindersActive } from "@/lib/selectors";

// Bridge exposed by the Electron preload (desktop app only).
declare global {
  interface Window {
    anchorDesktop?: {
      isDesktop: boolean;
      platform: string;
      version: string;
      notify: (title: string, body?: string) => Promise<boolean>;
    };
  }
}

const SEEN_KEY = "anchor:notified";

function loadSeen(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || "{}");
  } catch {
    return {};
  }
}

/**
 * Fires a native OS notification for reminders that are due today or overdue —
 * once per reminder per day. Uses the Electron bridge in the desktop app, and
 * the Web Notifications API in a normal browser.
 */
export function DesktopNotifier() {
  const data = useData((s) => s.data());

  useEffect(() => {
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "default" &&
      !window.anchorDesktop
    ) {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const fire = (title: string, body: string) => {
      if (window.anchorDesktop?.notify) {
        window.anchorDesktop.notify(title, body);
        return true;
      }
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification(title, { body });
        return true;
      }
      return false;
    };

    const check = () => {
      const today = new Date().toISOString().slice(0, 10);
      const due = personalRemindersActive(data).filter(
        (r) => r.dueDate && r.dueDate <= today
      );
      if (due.length === 0) return;
      const seen = loadSeen();
      let changed = false;
      for (const r of due) {
        if (seen[r.id] === today) continue;
        const overdue = (r.dueDate as string) < today;
        const ok = fire(
          overdue ? "Overdue reminder" : "Reminder due today",
          r.title
        );
        if (ok) {
          seen[r.id] = today;
          changed = true;
        }
      }
      if (changed) {
        try {
          localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
        } catch {}
      }
    };

    check();
    const t = setInterval(check, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [data]);

  return null;
}
