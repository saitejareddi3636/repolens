import { validCitation } from "./analyzer";
import type { Citation, SourceFile } from "./model";

export type SourceFinding = {
  title: string;
  detail: string;
  citation: Citation;
};
export type SourceAnswer = {
  summary: string;
  findings: SourceFinding[];
  nextStep: string;
  limitation: string;
};

export function parseSourceAnswer(
  response: string,
  file: SourceFile,
): SourceAnswer {
  const raw = response.trim().replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("The AI response could not be checked against source. Try again.");
  }
  if (!value || typeof value !== "object")
    throw new Error("The AI response could not be checked against source. Try again.");
  const answer = value as Partial<SourceAnswer>;
  const validText = (text: unknown, max: number) =>
    typeof text === "string" && text.trim().length > 0 && text.length <= max;
  if (
    !validText(answer.summary, 350) ||
    !validText(answer.nextStep, 350) ||
    !validText(answer.limitation, 250) ||
    !Array.isArray(answer.findings) ||
    answer.findings.length < 2 ||
    answer.findings.length > 4 ||
    !answer.findings.every(
      (finding) =>
        finding &&
        validText(finding.title, 80) &&
        validText(finding.detail, 300) &&
        validCitation(finding.citation, [file])
    )
  )
    throw new Error("The AI response cited unsupported source. Try again.");
  return answer as SourceAnswer;
}
