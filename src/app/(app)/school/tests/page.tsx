"use client";

import { useState } from "react";
import { Select } from "@/components/ui/Input";
import { GlassCard } from "@/components/ui/GlassCard";
import { TestsView } from "@/components/assessment/TestsView";
import { useData } from "@/store/data";
import { activeSubjects, assessmentsFor, subjectById, assessmentById } from "@/lib/selectors";

export default function TestsPage() {
  const d = useData((s) => s.data());
  const subjects = activeSubjects(d);
  const [subjectId, setSubjectId] = useState("");
  const [assessmentId, setAssessmentId] = useState("");

  const assessments = subjectId ? assessmentsFor(d, subjectId) : [];
  const tests = d.tests.filter((t) => {
    if (assessmentId) return t.assessmentId === assessmentId;
    if (subjectId) return t.subjectId === subjectId;
    return true;
  });

  const subject = subjectById(d, subjectId);
  const assessment = assessmentById(d, assessmentId);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 pt-1">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Practice tests</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Generate and take tests across your assessments.
          </p>
        </div>
        <div className="flex gap-2">
          <Select
            value={subjectId}
            onChange={(e) => {
              setSubjectId(e.target.value);
              setAssessmentId("");
            }}
            className="h-10 w-40 text-[13px]"
          >
            <option value="">All subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          {subjectId && (
            <Select
              value={assessmentId}
              onChange={(e) => setAssessmentId(e.target.value)}
              className="h-10 w-44 text-[13px]"
            >
              <option value="">All assessments</option>
              {assessments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </Select>
          )}
        </div>
      </div>

      <GlassCard className="mt-6 p-6">
        <TestsView
          tests={tests}
          subject={assessment ? subject : undefined}
          assessment={assessment ?? undefined}
        />
      </GlassCard>
    </div>
  );
}
