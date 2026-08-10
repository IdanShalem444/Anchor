"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Link2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useData } from "@/store/data";
import { CanvasConnectModal } from "./CanvasConnectModal";
import { useEntitlements } from "@/lib/billing/useEntitlements";
import { promptFeature } from "@/lib/billing/prompt";

type Status = {
  configured: boolean;
  baseUrl: string | null;
  daysLeft: number | null;
};

const STATUS_CACHE = "anchor:canvasStatus";

/**
 * Connect / sync the signed-in user's OWN Canvas. The token is stored per-user
 * server-side, so each person syncs their own courses + grades. Canvas tokens
 * expire (~120 days) — we surface that and prompt a reconnect.
 */
export function CanvasSyncButton() {
  const importFromCanvas = useData((s) => s.importFromCanvas);
  const ent = useEntitlements();
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [needsReconnect, setNeedsReconnect] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);

  function refreshStatus() {
    fetch("/api/canvas/status")
      .then((r) => r.json())
      .then((d) => {
        const s: Status = {
          configured: !!d.configured,
          baseUrl: d.baseUrl ?? null,
          daysLeft: typeof d.daysLeft === "number" ? d.daysLeft : null,
        };
        setStatus(s);
        try {
          localStorage.setItem(STATUS_CACHE, JSON.stringify(s));
        } catch {}
      })
      .catch(() => {});
  }
  useEffect(() => {
    // Show the last-known state instantly (no flash / no waiting for the API).
    try {
      const cached = localStorage.getItem(STATUS_CACHE);
      if (cached) setStatus(JSON.parse(cached));
    } catch {}
    refreshStatus();
  }, []);

  async function sync() {
    setBusy(true);
    setMsg(null);
    setNeedsReconnect(false);
    try {
      const res = await fetch("/api/canvas/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401 || data.expired) setNeedsReconnect(true);
        throw new Error(data.error || "Sync failed");
      }
      const r = importFromCanvas(data);
      setMsg(
        `Synced from Canvas — ${r.subjectsAdded} subject${r.subjectsAdded === 1 ? "" : "s"}, ` +
          `${r.assessmentsAdded} assessment${r.assessmentsAdded === 1 ? "" : "s"} imported` +
          `${r.assessmentsUpdated ? `, ${r.assessmentsUpdated} updated` : ""}. Open one and generate.`
      );
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Canvas sync failed.");
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(null), 10000);
    }
  }

  // Render immediately. Before the status check resolves we treat it as
  // "not connected" so the Connect button is on screen from the first paint
  // (no delay / pop-in); the cache makes returning users see the right state.
  const expired = typeof status?.daysLeft === "number" && status.daysLeft <= 0;
  const expiringSoon =
    typeof status?.daysLeft === "number" && status.daysLeft > 0 && status.daysLeft <= 14;

  return (
    <>
      {!status?.configured ? (
        <Button
          variant="secondary"
          onClick={() =>
            ent.can("canvas") ? setConnectOpen(true) : promptFeature("canvas", ent.plan)
          }
        >
          <Link2 size={15} /> Connect Canvas
        </Button>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {msg && <span className="max-w-[320px] text-[12.5px] text-ink-muted">{msg}</span>}

          {(expired || needsReconnect) && (
            <button
              onClick={() => setConnectOpen(true)}
              className="flex items-center gap-1.5 rounded-full bg-amber-500/[0.14] px-3 py-1.5 text-[12.5px] font-medium text-amber-700 hover:bg-amber-500/20"
            >
              <AlertTriangle size={13} /> Token expired — reconnect
            </button>
          )}
          {!expired && expiringSoon && (
            <span className="text-[12px] text-amber-700">
              Token expires in {status.daysLeft}d
            </span>
          )}

          <Button variant="secondary" onClick={sync} disabled={busy}>
            <RefreshCw size={15} className={busy ? "animate-spin" : ""} />
            {busy ? "Syncing…" : "Sync with Canvas"}
          </Button>
          <button
            onClick={() => setConnectOpen(true)}
            className="text-[12px] text-ink-faint underline hover:text-ink"
          >
            Manage
          </button>
        </div>
      )}
      <CanvasConnectModal
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        connectedUrl={status?.baseUrl ?? null}
        daysLeft={status?.daysLeft ?? null}
        onChanged={refreshStatus}
      />
    </>
  );
}
