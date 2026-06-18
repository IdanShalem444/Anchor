import {
  Sigma,
  BookOpen,
  FlaskConical,
  Globe2,
  Landmark,
  LineChart,
  Briefcase,
  Atom,
  Code2,
  Languages,
  type LucideIcon,
} from "lucide-react";
import type { SubjectType } from "./types";

export const SUBJECT_ICON: Record<SubjectType, LucideIcon> = {
  mathematics: Sigma,
  english: BookOpen,
  science: FlaskConical,
  geography: Globe2,
  history: Landmark,
  commerce: LineChart,
  business: Briefcase,
  stem: Atom,
  "computer-technology": Code2,
  language: Languages,
};

export const SUBJECT_TAGLINE: Record<SubjectType, string> = {
  mathematics: "Numbers, proofs & problem solving",
  english: "Texts, essays & expression",
  science: "Inquiry, evidence & explanation",
  geography: "Places, processes & people",
  history: "Sources, arguments & change",
  commerce: "Money, markets & choices",
  business: "Strategy, people & enterprise",
  stem: "Design, build & investigate",
  "computer-technology": "Code, systems & logic",
  language: "Vocabulary, grammar & fluency",
};

/** Which special toolkits a subject type unlocks in its assessments. */
export function subjectFeatures(type: SubjectType) {
  return {
    essayTools: type === "english",
    formulaSheet: type === "mathematics" || type === "stem",
    definitions: type === "science",
    vocabulary: type === "language",
  };
}
