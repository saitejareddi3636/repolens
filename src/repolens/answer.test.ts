import { describe, expect, it } from "vitest";
import { parseSourceAnswer } from "./answer";
const file = { path: "src/route.ts", language: "typescript", content: "const key = env.KEY;\nif (!key) throw Error();\n" };
const answer = {
  summary: "The route checks a key before doing work.",
  findings: [
    { title: "Configuration gate", detail: "Missing key stops the request.", citation: { path: "src/route.ts", start: 1, end: 2 } },
    { title: "Failure path", detail: "The route throws without a key.", citation: { path: "src/route.ts", start: 2, end: 2 } },
  ],
  nextStep: "Check that KEY is configured.",
  limitation: "The source does not prove deployed behavior.",
};
describe("source answer evidence", () => {
  it("accepts source-linked findings", () => {
    expect(parseSourceAnswer(JSON.stringify(answer), file)).toEqual(answer);
  });
  it("rejects invented citations", () => {
    const wrong = { ...answer, findings: [{ ...answer.findings[0], citation: { path: "missing.ts", start: 1, end: 2 } }, answer.findings[1]] };
    expect(() => parseSourceAnswer(JSON.stringify(wrong), file)).toThrow();
  });
});
