"use client";

import { useState } from "react";
import { Paperclip, Plus, Trash2, ExternalLink } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Tag } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/misc";
import { useData } from "@/store/data";
import { activeSubjects, subjectById } from "@/lib/selectors";

export default function ResourcesPage() {
  const d = useData((s) => s.data());
  const add = useData((s) => s.addResource);
  const del = useData((s) => s.deleteResource);
  const subjects = activeSubjects(d);

  const [subjectId, setSubjectId] = useState("");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");

  return (
    <div>
      <div className="pt-1">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Resources</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Links and references, organised by subject.
        </p>
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-2 rounded-3xl border border-black/[0.06] bg-white/50 p-4">
        <Select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          className="h-11 w-44 text-[13px]"
        >
          <option value="">Choose subject…</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <div className="min-w-[150px] flex-1">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
        </div>
        <div className="min-w-[150px] flex-1">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https:// (optional)" />
        </div>
        <Button
          variant="primary"
          disabled={!subjectId || !title.trim()}
          onClick={() => {
            add({
              subjectId,
              title: title.trim(),
              url: url.trim() || undefined,
              kind: url.trim() ? "link" : "note",
            });
            setTitle("");
            setUrl("");
          }}
        >
          <Plus size={16} /> Add
        </Button>
      </div>

      <div className="mt-6 space-y-6">
        {subjects.map((s) => {
          const list = d.resources.filter((r) => r.subjectId === s.id);
          if (list.length === 0) return null;
          return (
            <div key={s.id}>
              <Tag color={s.color} label={s.name} />
              <div className="mt-2 space-y-2">
                {list.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 rounded-2xl border border-black/[0.06] bg-white/60 px-4 py-3"
                  >
                    <Paperclip size={15} className="text-anchor" />
                    {r.url ? (
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex flex-1 items-center gap-1.5 truncate text-sm text-ink hover:underline"
                      >
                        {r.title} <ExternalLink size={12} className="text-ink-faint" />
                      </a>
                    ) : (
                      <span className="flex-1 truncate text-sm text-ink">{r.title}</span>
                    )}
                    <button onClick={() => del(r.id)} className="text-ink-faint hover:text-red-600">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {d.resources.length === 0 && (
          <EmptyState icon={Paperclip} title="No resources yet" description="Add your first link or reference above." />
        )}
      </div>
    </div>
  );
}
