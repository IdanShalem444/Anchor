"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { useData } from "@/store/data";
import { currentTerm } from "@/lib/format";
import type { Assessment, Priority, Term } from "@/lib/types";

const TERMS: Term[] = ["Term 1", "Term 2", "Term 3", "Term 4"];

export function CreateAssessmentModal({
  open,
  onClose,
  subjectId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  subjectId: string;
  onCreated?: (a: Assessment) => void;
}) {
  const addAssessment = useData((s) => s.addAssessment);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [term, setTerm] = useState<Term>(currentTerm());
  const [priority, setPriority] = useState<Priority>("medium");
  const [description, setDescription] = useState("");

  function create() {
    if (!title.trim()) return;
    const a = addAssessment({
      subjectId,
      title: title.trim(),
      description: description.trim() || undefined,
      dueDate: dueDate || undefined,
      term,
      priority,
    });
    setTitle("");
    setDueDate("");
    setDescription("");
    onClose();
    onCreated?.(a);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New assessment"
      description="Add an assessment, then upload its notification to generate everything."
      size="md"
    >
      <div className="space-y-4">
        <div>
          <Label>Name</Label>
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Algebra Assignment"
            onKeyDown={(e) => e.key === "Enter" && create()}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Due date</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div>
            <Label>Term</Label>
            <Select value={term} onChange={(e) => setTerm(e.target.value as Term)}>
              {TERMS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <Label>Priority</Label>
          <Select
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </Select>
        </div>
        <div>
          <Label>Description (optional)</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A short note about this assessment…"
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={create} disabled={!title.trim()}>
            Create assessment
          </Button>
        </div>
      </div>
    </Modal>
  );
}
