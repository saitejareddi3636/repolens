export type SourceFile = { path: string; content: string; language: string };
export type ModuleNode = {
  id: string;
  label: string;
  layer: "interface" | "server" | "data" | "foundation";
  imports: string[];
  exports: string[];
  lines: number;
};
export type ImportEdge = {
  source: string;
  target: string;
  line: number;
  specifier: string;
};
export type Citation = { path: string; start: number; end: number };
export type TourStep = {
  title: string;
  explanation: string;
  citation: Citation;
  kind: "source" | "inference";
};
export type Tour = { title: string; description: string; steps: TourStep[] };
export type Analysis = {
  repository: string;
  commit: string;
  description: string;
  files: SourceFile[];
  nodes: ModuleNode[];
  edges: ImportEdge[];
  tours: Tour[];
  warnings: string[];
  createdAt: string;
  engine: string;
};
export type AnalysisRow = {
  ownerId: string;
  repository: string;
  status: string;
  progress: number;
  message: string;
  analysis: Analysis | null;
  published: boolean;
  collaborators: string[];
};
export function sourceUrl(analysis: Analysis, c: Citation) {
  return `https://github.com/${analysis.repository}/blob/${analysis.commit}/${c.path.split("/").map(encodeURIComponent).join("/")}#L${c.start}-L${c.end}`;
}
