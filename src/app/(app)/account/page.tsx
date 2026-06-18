"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Camera,
  Download,
  Trash2,
  Check,
  Sparkles,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth, useCurrentUser, useCurrentSettings } from "@/store/auth";
import { useData } from "@/store/data";
import { fileToDataUrl } from "@/lib/extract";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export default function AccountPage() {
  const router = useRouter();
  const user = useCurrentUser();
  const settings = useCurrentSettings();
  const auth = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user?.name ?? "");
  const [pw, setPw] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [savedName, setSavedName] = useState(false);

  if (!user) return null;

  async function onPickAvatar(file?: File | null) {
    if (!file) return;
    const url = await fileToDataUrl(file);
    auth.updateProfile({ avatarUrl: url });
  }

  function exportData() {
    const id = useAuth.getState().currentUserId!;
    const bucket = useData.getState().byUser[id] ?? {};
    const payload = { profile: user, settings, data: bucket, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "anchor-export.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 pb-24">
      <h1 className="pt-2 text-2xl font-semibold tracking-tight text-ink">Account & settings</h1>

      {/* profile */}
      <GlassCard className="mt-6 p-6">
        <h2 className="text-[15px] font-semibold text-ink">Profile</h2>
        <div className="mt-4 flex flex-wrap items-center gap-5">
          <div className="relative">
            <Avatar name={user.name} src={user.avatarUrl} size={72} />
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-anchor text-white shadow-soft"
            >
              <Camera size={14} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onPickAvatar(e.target.files?.[0])}
            />
          </div>
          <div className="flex-1">
            <p className="text-[13px] text-ink-muted">Profile picture</p>
            <div className="mt-1 flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>
                Upload
              </Button>
              {user.avatarUrl && (
                <Button size="sm" variant="ghost" onClick={() => auth.updateProfile({ avatarUrl: null })}>
                  Use initials
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Name</Label>
            <div className="flex gap-2">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
              <Button
                variant="secondary"
                onClick={() => {
                  auth.updateProfile({ name: name.trim() || user.name });
                  setSavedName(true);
                  setTimeout(() => setSavedName(false), 1500);
                }}
              >
                {savedName ? <Check size={16} /> : "Save"}
              </Button>
            </div>
          </div>
          <div>
            <Label>Email</Label>
            <Input value={user.email} disabled />
          </div>
        </div>
      </GlassCard>

      {/* plan */}
      <Link href="/account/plans">
        <GlassCard interactive className="mt-4 flex items-center gap-4 p-6">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-anchor/10">
            <Sparkles size={20} className="text-anchor" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-semibold text-ink">Plan</h2>
              <Badge tone={user.plan === "pro" ? "anchor" : "neutral"}>{user.plan}</Badge>
            </div>
            <p className="text-[13px] text-ink-muted">Manage your plan or redeem a code.</p>
          </div>
          <ChevronRight size={18} className="text-ink-faint" />
        </GlassCard>
      </Link>

      {/* security */}
      <GlassCard className="mt-4 p-6">
        <h2 className="text-[15px] font-semibold text-ink">Security</h2>
        <div className="mt-3 max-w-sm">
          <Label>Change password</Label>
          <div className="flex gap-2">
            <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password" />
            <Button
              variant="secondary"
              onClick={async () => {
                const res = await auth.changePassword(pw);
                setPwMsg(res.ok ? "Password updated." : res.error ?? "Failed.");
                if (res.ok) setPw("");
                setTimeout(() => setPwMsg(null), 2500);
              }}
            >
              Update
            </Button>
          </div>
          {pwMsg && <p className="mt-2 text-[13px] font-medium text-anchor-700">{pwMsg}</p>}
        </div>
      </GlassCard>

      {/* preferences */}
      <GlassCard className="mt-4 p-6">
        <h2 className="text-[15px] font-semibold text-ink">Preferences</h2>
        <div className="mt-3 space-y-1">
          <Toggle
            label="Notifications"
            desc="Surface upcoming deadlines and reminders"
            checked={!!settings?.notifications}
            onChange={(v) => auth.updateSettings({ notifications: v })}
          />
          <Toggle
            label="Reduce motion"
            desc="Minimise animations across Anchor"
            checked={!!settings?.reduceMotion}
            onChange={(v) => auth.updateSettings({ reduceMotion: v })}
          />
        </div>
      </GlassCard>

      {/* data */}
      <GlassCard className="mt-4 p-6">
        <h2 className="text-[15px] font-semibold text-ink">Your data</h2>
        <p className="mt-1 text-[13px] text-ink-muted">
          {isSupabaseConfigured
            ? "Your work syncs securely to your account and saves automatically across devices."
            : "Saved on this device until a backend is connected."}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={exportData}>
            <Download size={15} /> Export data
          </Button>
        </div>
        <div className="mt-3 flex items-center gap-2 text-[12.5px] text-ink-faint">
          <ShieldCheck size={14} />
          {isSupabaseConfigured
            ? "Synced with your secure cloud workspace."
            : "Add Supabase keys to enable cross-device sync."}
        </div>
      </GlassCard>

      {/* danger */}
      <GlassCard className="mt-4 border border-red-500/20 p-6">
        <h2 className="text-[15px] font-semibold text-red-600">Delete account</h2>
        <p className="mt-1 text-[13px] text-ink-muted">
          Permanently remove your account from this device.
        </p>
        <Button variant="danger" className="mt-3" onClick={() => setDeleteOpen(true)}>
          <Trash2 size={15} /> Delete account
        </Button>
      </GlassCard>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete account" size="md">
        <div className="space-y-4">
          <p className="text-sm text-ink-soft">
            This removes your profile and sign-in from this device. Type <strong>DELETE</strong> to confirm.
          </p>
          <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="DELETE" />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button
              variant="danger"
              disabled={confirmText !== "DELETE"}
              onClick={async () => {
                await auth.deleteAccount();
                router.replace("/");
              }}
            >
              Delete forever
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Toggle({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="text-[12.5px] text-ink-muted">{desc}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-anchor" : "bg-black/15"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-[22px]" : "translate-x-0.5"}`}
        />
      </button>
    </div>
  );
}
