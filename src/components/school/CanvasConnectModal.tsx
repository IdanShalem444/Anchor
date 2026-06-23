"use client";

import { useState } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

export function CanvasConnectModal({
  open,
  onClose,
  connectedUrl,
  daysLeft,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  connectedUrl: string | null;
  daysLeft?: number | null;
  onChanged: () => void;
}) {
  const [baseUrl, setBaseUrl] = useState(connectedUrl || "");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connect() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/canvas/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseUrl, token }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Couldn't connect.");
      onChanged();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't connect.");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    await fetch("/api/canvas/disconnect", { method: "POST" }).catch(() => {});
    setBusy(false);
    onChanged();
    onClose();
  }

  const expired = typeof daysLeft === "number" && daysLeft <= 0;
  const expiringSoon = typeof daysLeft === "number" && daysLeft > 0 && daysLeft <= 14;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={connectedUrl ? "Manage Canvas" : "Connect Canvas"}
      description="Link your own Canvas to sync your courses, assignments, briefs and grades. Your token is stored privately on your account — friends connect their own."
      size="md"
    >
      <div className="space-y-4">
        {connectedUrl && typeof daysLeft === "number" && (
          <div
            className={
              "flex items-start gap-2 rounded-xl px-3 py-2.5 text-[12.5px] " +
              (expired || expiringSoon
                ? "bg-amber-500/[0.12] text-amber-700"
                : "bg-emerald-500/[0.1] text-emerald-700")
            }
          >
            {expired || expiringSoon ? (
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            ) : (
              <Clock size={15} className="mt-0.5 shrink-0" />
            )}
            <span>
              {expired
                ? `Your token expired about ${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? "" : "s"} ago — generate a new one below and reconnect.`
                : `Connected. Your token expires in about ${daysLeft} day${daysLeft === 1 ? "" : "s"}${expiringSoon ? " — good time to refresh it." : "."}`}
            </span>
          </div>
        )}

        <div>
          <Label>Canvas URL</Label>
          <Input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="yourschool.instructure.com"
          />
          <p className="mt-1.5 text-[12px] text-ink-faint">
            Your Canvas address — e.g. <strong>emanuel.instructure.com</strong>. https:// is optional.
          </p>
        </div>

        <div>
          <Label>Access token</Label>
          <Input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste a Canvas access token"
          />
          <div className="mt-2 rounded-xl bg-black/[0.03] px-3 py-2.5 text-[12px] leading-relaxed text-ink-soft">
            <p className="font-medium text-ink">How to get a token:</p>
            <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-ink-muted">
              <li>In Canvas: your avatar → <strong>Account → Settings</strong>.</li>
              <li>Scroll to <strong>Approved Integrations</strong> → <strong>+ New Access Token</strong>.</li>
              <li>Purpose: “Anchor”. Leave <strong>Expires</strong> blank for the longest your school allows.</li>
              <li><strong>Generate Token</strong>, copy it, and paste it above.</li>
            </ol>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-xl bg-anchor/[0.07] px-3 py-2.5 text-[12px] leading-relaxed text-ink-soft">
          <Clock size={15} className="mt-0.5 shrink-0 text-anchor" />
          <span>
            <strong className="text-ink">Tokens expire — usually after about 120 days.</strong>{" "}
            When yours does, syncing stops and Anchor will remind you here. Just generate a new
            token and reconnect — everything you&apos;ve already imported stays in Anchor.
          </span>
        </div>

        {error && <p className="text-[13px] font-medium text-red-600">{error}</p>}

        <div className="flex items-center justify-between pt-1">
          {connectedUrl ? (
            <button
              onClick={disconnect}
              disabled={busy}
              className="text-[13px] font-medium text-red-600 hover:underline"
            >
              Disconnect
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={connect} disabled={busy || !baseUrl || !token}>
              {busy ? "Connecting…" : connectedUrl ? "Reconnect" : "Connect"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
