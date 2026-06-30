"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, FolderKanban, CheckCircle2 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ProgressBar, EmptyState } from "@/components/ui/misc";
import { useData } from "@/store/data";
import { useQueryParam } from "@/lib/hooks";
import { SUBJECT_COLORS } from "@/lib/colors";
import { cn } from "@/lib/cn";
import { useEntitlements } from "@/lib/billing/useEntitlements";
import { UpgradeGate } from "@/components/billing/UpgradeGate";

export default function ProjectsPage() {
  const router = useRouter();
  const d = useData((s) => s.data());
  const addProject = useData((s) => s.addProject);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [color, setColor] = useState<string>(SUBJECT_COLORS[1]);
  const newFlag = useQueryParam("new");
  const ent = useEntitlements();

  useEffect(() => {
    if (newFlag === "1") setOpen(true);
  }, [newFlag]);

  const projects = d.projects.filter((p) => !p.deletedAt);

  function create() {
    if (!name.trim()) return;
    const p = addProject({ name: name.trim(), description: desc.trim() || undefined, color });
    setName("");
    setDesc("");
    setOpen(false);
    router.push(`/personal/projects/${p.id}`);
  }

  // Projects is a Basic+ feature.
  if (!ent.can("projects")) return <UpgradeGate feature="projects" />;

  return (
    <div>
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Projects</h1>
          <p className="mt-1 text-sm text-ink-muted">Creative workspaces for your ideas — each with notes, tasks and files.</p>
        </div>
        <Button variant="primary" onClick={() => setOpen(true)}>
          <Plus size={16} /> New project
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description="Start a project — an app idea, an artwork, a renovation plan — and get a workspace to organise it."
            action={
              <Button variant="primary" onClick={() => setOpen(true)}>
                <Plus size={16} /> New project
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p, i) => {
            const doneTasks = p.tasks.filter((t) => t.done).length;
            const progress = p.tasks.length ? (doneTasks / p.tasks.length) * 100 : 0;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.3) }}
              >
                <Link href={`/personal/projects/${p.id}`}>
                  <GlassCard interactive className="relative h-full overflow-hidden p-6">
                    <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: p.color }} />
                    <div className="grid h-11 w-11 place-items-center rounded-2xl" style={{ backgroundColor: `${p.color}1a` }}>
                      <FolderKanban size={20} style={{ color: p.color }} />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold tracking-tight text-ink">{p.name}</h3>
                    <p className="mt-0.5 line-clamp-2 text-[13px] text-ink-muted">{p.description || "No description"}</p>
                    <div className="mt-4 flex items-center gap-2 text-[12.5px] text-ink-muted">
                      <CheckCircle2 size={13} /> {doneTasks}/{p.tasks.length} tasks
                    </div>
                    <ProgressBar value={progress} color={p.color} className="mt-1.5" />
                  </GlassCard>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New project" size="md">
        <div className="space-y-4">
          <div>
            <Label>Project name</Label>
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Portfolio website" onKeyDown={(e) => e.key === "Enter" && create()} />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What's this project about?" />
          </div>
          <div>
            <Label>Colour</Label>
            <div className="flex flex-wrap gap-2">
              {SUBJECT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn("h-8 w-8 rounded-full transition-transform hover:scale-110", color === c && "ring-2 ring-offset-2")}
                  style={{ backgroundColor: c, ...({ "--tw-ring-color": c } as React.CSSProperties) }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={create} disabled={!name.trim()}>Create project</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
