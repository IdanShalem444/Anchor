"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Trash2,
  Plus,
  Check,
  Flag,
  Link2,
  ExternalLink,
  FolderKanban,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ProgressBar, EmptyState } from "@/components/ui/misc";
import { useData } from "@/store/data";
import { uid, relativeTime } from "@/lib/format";
import { cn } from "@/lib/cn";

export default function ProjectWorkspace({ params }: { params: { projectId: string } }) {
  const router = useRouter();
  const d = useData((s) => s.data());
  const update = useData((s) => s.updateProject);
  const del = useData((s) => s.deleteProject);
  const project = d.projects.find((p) => p.id === params.projectId && !p.deletedAt);

  const [name, setName] = useState(project?.name ?? "");
  const [body, setBody] = useState(project?.body ?? "");
  const [task, setTask] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [milestone, setMilestone] = useState("");

  if (!project) {
    return (
      <div className="pt-6">
        <EmptyState
          icon={FolderKanban}
          title="Project not found"
          action={
            <Link href="/personal/projects">
              <Button variant="secondary">Back to projects</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const doneTasks = project.tasks.filter((t) => t.done).length;
  const progress = project.tasks.length ? (doneTasks / project.tasks.length) * 100 : 0;

  return (
    <div>
      <Link href="/personal/projects" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-muted hover:text-ink">
        <ArrowLeft size={15} /> Projects
      </Link>

      <GlassCard className="relative mt-3 overflow-hidden p-6">
        <div className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: project.color }} />
        <div className="flex items-start justify-between gap-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => update(project.id, { name: name.trim() || project.name })}
            className="w-full bg-transparent text-2xl font-semibold tracking-tight text-ink focus:outline-none sm:text-3xl"
          />
          <Button
            variant="ghost"
            className="shrink-0 text-red-600 hover:bg-red-500/10"
            onClick={() => {
              if (confirm(`Delete "${project.name}"?`)) {
                del(project.id);
                router.push("/personal/projects");
              }
            }}
          >
            <Trash2 size={15} /> Delete
          </Button>
        </div>
        {project.tasks.length > 0 && (
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-[12.5px] text-ink-muted">
              <span>{doneTasks}/{project.tasks.length} tasks complete</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <ProgressBar value={progress} color={project.color} />
          </div>
        )}
      </GlassCard>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        {/* writing space */}
        <GlassCard className="p-6">
          <h3 className="text-[15px] font-semibold text-ink">Workspace</h3>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onBlur={() => update(project.id, { body })}
            placeholder="Brain-dump, plan, and write everything about this project here. It saves automatically…"
            className="mt-3 min-h-[440px] w-full resize-none bg-transparent text-[15px] leading-relaxed text-ink-soft placeholder:text-ink-faint focus:outline-none"
          />
          <p className="text-[12px] text-ink-faint">Saved {relativeTime(project.createdAt)}</p>
        </GlassCard>

        <div className="space-y-4">
          {/* tasks */}
          <GlassCard className="p-5">
            <h3 className="mb-3 text-[15px] font-semibold text-ink">Tasks</h3>
            <div className="space-y-1.5">
              {project.tasks.map((t) => (
                <div key={t.id} className="flex items-center gap-2.5">
                  <button
                    onClick={() =>
                      update(project.id, {
                        tasks: project.tasks.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)),
                      })
                    }
                    className={cn(
                      "grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors",
                      t.done ? "border-anchor bg-anchor text-white" : "border-black/20 text-transparent hover:border-anchor"
                    )}
                  >
                    <Check size={12} />
                  </button>
                  <span className={cn("flex-1 text-[13.5px]", t.done ? "text-ink-faint line-through" : "text-ink-soft")}>
                    {t.title}
                  </span>
                  <button
                    onClick={() => update(project.id, { tasks: project.tasks.filter((x) => x.id !== t.id) })}
                    className="text-ink-faint hover:text-red-600"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Input
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder="Add a task…"
                className="h-9 text-[13px]"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && task.trim()) {
                    update(project.id, { tasks: [...project.tasks, { id: uid(), title: task.trim(), done: false }] });
                    setTask("");
                  }
                }}
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  if (!task.trim()) return;
                  update(project.id, { tasks: [...project.tasks, { id: uid(), title: task.trim(), done: false }] });
                  setTask("");
                }}
              >
                <Plus size={14} />
              </Button>
            </div>
          </GlassCard>

          {/* milestones */}
          <GlassCard className="p-5">
            <h3 className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-ink">
              <Flag size={15} className="text-anchor" /> Milestones
            </h3>
            <div className="space-y-1.5">
              {project.milestones.map((m) => (
                <div key={m.id} className="flex items-center gap-2.5">
                  <button
                    onClick={() =>
                      update(project.id, {
                        milestones: project.milestones.map((x) => (x.id === m.id ? { ...x, done: !x.done } : x)),
                      })
                    }
                    className={cn(
                      "grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors",
                      m.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-black/20 text-transparent hover:border-emerald-400"
                    )}
                  >
                    <Check size={11} />
                  </button>
                  <span className={cn("flex-1 text-[13.5px]", m.done ? "text-ink-faint line-through" : "text-ink-soft")}>
                    {m.title}
                  </span>
                  <button
                    onClick={() => update(project.id, { milestones: project.milestones.filter((x) => x.id !== m.id) })}
                    className="text-ink-faint hover:text-red-600"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Input
                value={milestone}
                onChange={(e) => setMilestone(e.target.value)}
                placeholder="Add a milestone…"
                className="h-9 text-[13px]"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && milestone.trim()) {
                    update(project.id, { milestones: [...project.milestones, { id: uid(), title: milestone.trim(), done: false }] });
                    setMilestone("");
                  }
                }}
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  if (!milestone.trim()) return;
                  update(project.id, { milestones: [...project.milestones, { id: uid(), title: milestone.trim(), done: false }] });
                  setMilestone("");
                }}
              >
                <Plus size={14} />
              </Button>
            </div>
          </GlassCard>

          {/* links */}
          <GlassCard className="p-5">
            <h3 className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-ink">
              <Link2 size={15} className="text-anchor" /> Links & files
            </h3>
            <div className="space-y-1.5">
              {project.links.map((l) => (
                <div key={l.id} className="flex items-center gap-2">
                  <a href={l.url} target="_blank" rel="noreferrer" className="flex flex-1 items-center gap-1.5 truncate text-[13px] text-ink-soft hover:underline">
                    {l.label} <ExternalLink size={11} className="text-ink-faint" />
                  </a>
                  <button
                    onClick={() => update(project.id, { links: project.links.filter((x) => x.id !== l.id) })}
                    className="text-ink-faint hover:text-red-600"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-2">
              <Input value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} placeholder="Label" className="h-9 text-[13px]" />
              <div className="flex gap-2">
                <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…" className="h-9 text-[13px]" />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    if (!linkLabel.trim() || !linkUrl.trim()) return;
                    update(project.id, { links: [...project.links, { id: uid(), label: linkLabel.trim(), url: linkUrl.trim() }] });
                    setLinkLabel("");
                    setLinkUrl("");
                  }}
                >
                  <Plus size={14} />
                </Button>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
