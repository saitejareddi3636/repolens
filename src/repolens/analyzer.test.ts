import { describe, expect, it } from "vitest";
import {
  analyzeSources,
  parseRepository,
  resolveImport,
  validCitation,
} from "./analyzer";
const files = [
  {
    path: "src/app.ts",
    language: "typescript",
    content:
      '// import fake from "./fake"\nimport { run } from "./run.js"\nexport const app = run;',
  },
  {
    path: "src/run.ts",
    language: "typescript",
    content: "export const run = 1;",
  },
];
describe("evidence boundaries", () => {
  it("rejects non-GitHub URLs and traversal", () => {
    for (const url of [
      "http://localhost/a",
      "https://evil.test/a/b",
      "a/..",
      "https://github.com/a/b/tree/main",
    ])
      expect(() => parseRepository(url)).toThrow();
  });
  it("accepts canonical public repo input", () =>
    expect(
      parseRepository("https://github.com/deepdotspace/taskspace.git"),
    ).toBe("deepdotspace/taskspace"));
  it("parses actual imports, ignores comments, resolves JS-to-TS", () => {
    const a = analyzeSources("a/b", "a".repeat(40), files);
    expect(a.edges).toEqual([
      {
        source: "src/app.ts",
        target: "src/run.ts",
        line: 2,
        specifier: "./run.js",
      },
    ]);
    expect(a.nodes[0].exports).toContain("app");
  });
  it("does not invent an external dependency node", () =>
    expect(
      resolveImport("src/a.ts", "react", new Set(["react"])),
    ).toBeUndefined());
  it("rejects fabricated paths and line ranges", () => {
    expect(validCitation({ path: "src/run.ts", start: 1, end: 1 }, files)).toBe(
      true,
    );
    for (const c of [
      { path: "missing.ts", start: 1, end: 1 },
      { path: "src/run.ts", start: 0, end: 1 },
      { path: "src/run.ts", start: 1, end: 90 },
    ])
      expect(validCitation(c, files)).toBe(false);
  });
});
