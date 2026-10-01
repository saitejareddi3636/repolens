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

export function parseSourceAnswer(response: string, file: SourceFile): SourceAnswer {
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
  const text = (value: unknown, fallback: string, max: number) =>
    typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
  const findings = (Array.isArray(answer.findings) ? answer.findings : [])
    .flatMap((finding: unknown) => {
      if (!finding || typeof finding !== "object") return [];
      const item = finding as Partial<SourceFinding>;
      const rawCitation = item.citation as (Partial<Citation> & { line?: number }) | undefined;
      const start = Number(rawCitation?.start ?? rawCitation?.line);
      const end = Number(rawCitation?.end ?? rawCitation?.line ?? rawCitation?.start);
      const suppliedPath = rawCitation?.path;
      if (
        suppliedPath &&
        suppliedPath !== file.path &&
        suppliedPath !== file.path.split("/").pop()
      ) return [];
      const citation = { path: file.path, start, end };
      if (
        !item.title ||
        !item.detail ||
        !validCitation(citation, [file])
      ) return [];
      return [{
        title: text(item.title, "Source finding", 80),
        detail: text(item.detail, "", 300),
        citation,
      }];
    })
    .slice(0, 4);
  if (!findings.length)
    throw new Error("The AI could not provide a verifiable source line. Try a more specific question.");
  return {
    summary: text(answer.summary, "This file contains the cited behavior below.", 350),
    findings,
    nextStep: text(answer.nextStep, "Open the cited lines and trace the next call.", 350),
    limitation: text(answer.limitation, "This is static source analysis, not a runtime test.", 250),
  };
}
