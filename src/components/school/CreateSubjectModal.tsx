"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { useData } from "@/store/data";
import {
  SUBJECT_TYPE_LABELS,
  DEFAULT_SUBJECT_COLOR,
  LANGUAGES,
  type SubjectType,
  type LanguageName,
  type Subject,
} from "@/lib/types";
import { SUBJECT_ICON } from "@/lib/subjectMeta";
import { SUBJECT_COLORS } from "@/lib/colors";
import { cn } from "@/lib/cn";

const TYPES = Object.keys(SUBJECT_TYPE_LABELS) as SubjectType[];

export function CreateSubjectModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (s: Subject) => void;
}) {
  const addSubject = useData((s) => s.addSubject);
  const [type, setType] = useState<SubjectType>("mathematics");
  const [language, setLanguage] = useState<LanguageName>("French");
  const [name, setName] = useState("");
  const [color, setColor] = useState(DEFAULT_SUBJECT_COLOR.mathematics);
  const [desc, setDesc] = useState("");

  function pickType(t: SubjectType) {
    setType(t);
    setColor(DEFAULT_SUBJECT_COLOR[t]);
    if (t !== "language") setName(SUBJECT_TYPE_LABELS[t]);
    else setName(language);
  }

  function create() {
    const finalName =
      name.trim() ||
      (type === "language" ? language : SUBJECT_TYPE_LABELS[type]);
    const subject = addSubject({
      type,
      name: finalName,
      language: type === "language" ? language : undefined,
      color,
      description: desc.trim() || undefined,
    });
    reset();
    onClose();
    onCreated?.(subject);
  }

  function reset() {
    setType("mathematics");
    setName("");
    setColor(DEFAULT_SUBJECT_COLOR.mathematics);
    setDesc("");
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New subject"
      description="Subjects work like a Notion workspace — everything inside links by colour."
      size="lg"
    >
      <div className="space-y-5">
        <div>
          <Label>Subject type</Label>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {TYPES.map((t) => {
              const Icon = SUBJECT_ICON[t];
              const active = t === type;
              return (
                <button
                  key={t}
                  onClick={() => pickType(t)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-center transition-all",
                    active
                      ? "border-anchor/30 bg-anchor/[0.06] shadow-soft"
                      : "border-black/[0.06] hover:border-black/[0.12] hover:bg-black/[0.02]"
                  )}
                >
                  <Icon
                    size={18}
                    style={{ color: active ? color : undefined }}
                    className={active ? "" : "text-ink-faint"}
                  />
                  <span className="text-[11px] font-medium leading-tight text-ink-soft">
                    {SUBJECT_TYPE_LABELS[t]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {type === "language" && (
          <div>
            <Label>Language</Label>
            <Select
              value={language}
              onChange={(e) => {
                const l = e.target.value as LanguageName;
                setLanguage(l);
                setName(l);
              }}
            >
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div>
          <Label>Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={
              type === "language" ? language : SUBJECT_TYPE_LABELS[type]
            }
          />
        </div>

        <div>
          <Label>Colour tag</Label>
          <div className="flex flex-wrap gap-2">
            {SUBJECT_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={cn(
                  "h-8 w-8 rounded-full transition-transform hover:scale-110",
                  color === c && "ring-2 ring-offset-2 ring-offset-white"
                )}
                style={{
                  backgroundColor: c,
                  // @ts-expect-error css var for ring
                  "--tw-ring-color": c,
                }}
                aria-label={`Colour ${c}`}
              />
            ))}
          </div>
        </div>

        <div>
          <Label>Description (optional)</Label>
          <Input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="e.g. Year 11 Advanced — Mr Smith"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={create}>
            Create subject
          </Button>
        </div>
      </div>
    </Modal>
  );
}
