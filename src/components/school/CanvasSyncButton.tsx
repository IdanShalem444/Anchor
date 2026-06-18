"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Link2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useData } from "@/store/data";
import { CanvasConnectModal } from "./CanvasConnectModal";

type Status = { configured: boolean; baseUrl: string | null };

/**
 * Connect / sync the signed-in user's OWN Canvas. The token is stored per-user
 * server-side, so each person syncs their own courses + grades.
 */
export function CanvasSyncButton() {
  const importFromCanvas = useData((s) => s.importFromCanvas);
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);

  function refreshStatus() {
    fetch("/api/canvas/status")
      .then((r) => r.json())
      .then((d) => setStatus({ configured: !!d.configured, baseUrl: d.baseUrl ?? null }))
      .catch(() => setStatus({ configured: false, baseUrl: null }));
  }
  useEffect(() => {
    refreshStatus();
  }, []);

  async function sync() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/canvas/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");
      const r = importFromCanvas(data);
      setMsg(
        `Synced from Canvas — ${r.subjectsAdded} subject${r.subjectsAdded === 1 ? "" : "s"}, ` +
          `${r.assessmentsAdded} assignment${r.assessmentsAdded === 1 ? "" : "s"} imported` +
          `${r.assessmentsUpdated ? `, ${r.assessmentsUpdated} updated` : ""}. Open one and generate.`
      );
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Canvas sync failed.");
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(null), 8000);
    }
  }

  if (!status) return null;

  return (
    <>
      {!status.configured ? (
        <Button variant="secondary" onClick={() => setConnectOpen(true)}>
          <Link2 size={15} /> Connect Canvas
        </Button>
      ) : (
        <div className="flex items-center gap-2">
          {msg && <span className="max-w-[280px] text-[12.5px] text-ink-muted">{msg}</span>}
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
        connectedUrl={status.baseUrl}
        onChanged={refreshStatus}
      />
    </>
  );
}
