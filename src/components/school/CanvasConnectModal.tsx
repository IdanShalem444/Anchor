"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

export function CanvasConnectModal({
  open,
  onClose,
  connectedUrl,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  connectedUrl: string | null;
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Connect Canvas"
      description="Link your own Canvas to sync your courses, assignments, briefs and grades. Your token is stored privately on your account."
      size="md"
    >
      <div className="space-y-4">
        <div>
          <Label>Canvas URL</Label>
          <Input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://yourschool.instructure.com"
          />
        </div>
        <div>
          <Label>Access token</Label>
          <Input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste a Canvas access token"
          />
          <p className="mt-1.5 text-[12px] text-ink-faint">
            In Canvas: Account → Settings → <strong>+ New Access Token</strong> → copy it here.
          </p>
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
              {busy ? "Connecting…" : "Connect"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
