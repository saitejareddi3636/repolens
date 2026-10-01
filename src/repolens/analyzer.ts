import { parse } from "@babel/parser";
import type { Analysis, Citation, ModuleNode, SourceFile, Tour } from "./model";
export function parseRepository(input: unknown): string {
  if (typeof input !== "string")
    throw new Error("Enter a public GitHub repository URL.");
  const text = input
    .trim()
    .replace(/\/$/, "")
    .replace(/\.git$/, "");
  const match =
    /^(?:https:\/\/github\.com\/)?([A-Za-z0-9][A-Za-z0-9-]{0,38})\/([A-Za-z0-9_.-]{1,100})$/.exec(
      text,
    );
  if (!match || match[2] === "." || match[2] === "..")
    throw new Error(
      "Use github.com/owner/repository, without a branch or file path.",
    );
  return `${match[1]}/${match[2]}`;
}
function normalize(path: string) {
  const parts: string[] = [];
  for (const part of path.split("/")) {
    if (part === "..") parts.pop();
    else if (part !== "." && part) parts.push(part);
  }
  return parts.join("/");
}
export function resolveImport(
  from: string,
  spec: string,
  paths: Set<string>,
): string | undefined {
  const base = spec.startsWith(".")
    ? normalize(`${from.split("/").slice(0, -1).join("/")}/${spec}`)
    : null;
  if (!base) return;
  const stem = base.replace(/\.(js|jsx|mjs)$/, "");
  return [
    base,
    ...[
      ".ts",
      ".tsx",
      ".js",
      ".jsx",
      ".mjs",
      "/index.ts",
      "/index.tsx",
      "/index.js",
    ].map((e) => stem + e),
  ].find((p) => paths.has(p));
}
function layer(path: string): ModuleNode["layer"] {
  if (/(schema|model|store|database|\/db[/.])/.test(path)) return "data";
  if (/(worker|server|actions|jobs|api\/|routes\/)/.test(path)) return "server";
  if (/\.(tsx|jsx)$/.test(path)) return "interface";
  return "foundation";
}
export function analyzeSources(
  repository: string,
  commit: string,
  files: SourceFile[],
  description = "",
): Analysis {
  const paths = new Set(files.map((f) => f.path));
  const edges: Analysis["edges"] = [];
  const nodes = files.map((file) => {
    const source = parse(file.content, {
      sourceType: "unambiguous",
      plugins: file.path.endsWith("x") ? ["typescript", "jsx"] : ["typescript"],
      errorRecovery: true,
    });
    const imports: string[] = [];
    const exports: string[] = [];
    for (const statement of source.program.body) {
      if (
        (statement.type === "ImportDeclaration" ||
          statement.type === "ExportNamedDeclaration" ||
          statement.type === "ExportAllDeclaration") &&
        statement.source
      ) {
        const spec = statement.source.value;
        imports.push(spec);
        const target = resolveImport(file.path, spec, paths);
        if (target)
          edges.push({
            source: file.path,
            target,
            line: statement.loc?.start.line || 1,
            specifier: spec,
          });
      }
      if (
        statement.type === "ExportNamedDeclaration" ||
        statement.type === "ExportDefaultDeclaration"
      ) {
        const d = statement.declaration;
        if (d && "id" in d && d.id?.type === "Identifier")
          exports.push(d.id.name);
        if (d?.type === "VariableDeclaration")
          for (const item of d.declarations)
            if (item.id.type === "Identifier") exports.push(item.id.name);
        if (statement.type === "ExportDefaultDeclaration")
          exports.push("default");
      }
    }
    return {
      id: file.path,
      label: file.path.split("/").pop()!,
      layer: layer(file.path),
      imports,
      exports,
      lines: file.content.split("\n").length,
    };
  });
  const ranked = [...nodes].sort(
    (a, b) =>
      edges.filter((e) => e.source === b.id).length -
      edges.filter((e) => e.source === a.id).length,
  );
  const tours: Tour[] = ranked
    .filter((n) => edges.some((e) => e.source === n.id))
    .slice(0, 3)
    .map((node) => {
      const targets = edges.filter((e) => e.source === node.id).slice(0, 4);
      return {
        title: `Inside ${node.label}`,
        description:
          "Follow verified static imports. This is a dependency walkthrough, not an execution trace.",
        steps: [
          {
            title: `Start at ${node.label}`,
            explanation: `This ${node.layer} module has ${node.lines} lines and ${node.imports.length} static imports. ${node.exports.length ? `Named exports include ${node.exports.slice(0, 4).join(", ")}.` : "Open the source to inspect its implementation."}`,
            citation: {
              path: node.id,
              start: 1,
              end: Math.min(18, node.lines),
            },
            kind: "source",
          },
          ...targets.map((e) => ({
            title: `Follow ${e.specifier}`,
            explanation: `${node.label} imports this module at line ${e.line}. The relationship is established by parsing the source; it does not imply a runtime call.`,
            citation: {
              path: e.target,
              start: 1,
              end: Math.min(18, nodes.find((n) => n.id === e.target)!.lines),
            },
            kind: "source" as const,
          })),
        ],
      };
    });
  if (!tours.length && nodes.length)
    tours.push({
      title: "Read the entry module",
      description: "A source-based starting point.",
      steps: [
        {
          title: nodes[0].label,
          explanation:
            "No resolvable local static imports were found in the analyzed files.",
          citation: {
            path: nodes[0].id,
            start: 1,
            end: Math.min(18, nodes[0].lines),
          },
          kind: "source",
        },
      ],
    });
  return {
    repository,
    commit,
    description,
    files,
    nodes,
    edges,
    tours,
    warnings: [
      "Static imports only; dynamic loading, custom aliases, and runtime behavior are not reconstructed.",
    ],
    createdAt: new Date().toISOString(),
    engine: "Babel TypeScript AST",
  };
}
export function validCitation(
  value: unknown,
  files: SourceFile[],
): value is Citation {
  if (!value || typeof value !== "object") return false;
  const c = value as Citation;
  const file = files.find((f) => f.path === c.path);
  return (
    !!file &&
    Number.isInteger(c.start) &&
    Number.isInteger(c.end) &&
    c.start >= 1 &&
    c.end >= c.start &&
    c.end <= file.content.split("\n").length &&
    c.end - c.start <= 80
  );
}
