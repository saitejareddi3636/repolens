import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Code2,
  Copy,
  Download,
  FileCode2,
  GitBranch,
  Github,
  Layers,
  Link2,
  LoaderCircle,
  Maximize2,
  PanelLeft,
  Focus,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import type { Analysis, AnalysisRow, Citation } from "./model";
import type { SourceAnswer } from "./answer";
import { sourceUrl } from "./model";
import "./repolens.css";
export type Bridge = {
  signedIn: boolean;
  userId: string | null;
  records: Array<{ recordId: string; data: AnalysisRow }>;
  currentId: string | null;
  analysisStatus: "loading" | "ready";
  select: (id: string | null) => void;
  login: (intent?: "import") => void;
  logout: () => void;
  action: (
    name: string,
    params: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>;
};
const layers = ["interface", "server", "data", "foundation"] as const;
function mostConnected(analysis: Analysis) {
  const counts = new Map<string, number>();
  for (const edge of analysis.edges) {
    counts.set(edge.source, (counts.get(edge.source) || 0) + 1);
    counts.set(edge.target, (counts.get(edge.target) || 0) + 1);
  }
  return [...analysis.nodes].sort(
    (a, b) => (counts.get(b.id) || 0) - (counts.get(a.id) || 0),
  )[0]?.id || "";
}
const layerNames = {
  interface: "Interface",
  server: "Server",
  data: "Data",
  foundation: "Foundation",
};
export default function Workspace({
  analysis,
  bridge,
}: {
  analysis: Analysis;
  bridge?: Bridge;
}) {
  const [view, setView] = useState<"map" | "tour" | "source">("map");
  const [selected, setSelected] = useState(() => mostConnected(analysis));
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [focusGraph, setFocusGraph] = useState(
    analysis.nodes.length > 24 && analysis.edges.length > 0,
  );
  const [inspectorExpanded, setInspectorExpanded] = useState(false);
  const graphViewport = useRef<HTMLDivElement>(null);
  useEffect(() => {
    graphViewport.current?.scrollTo({ top: 0, left: 0 });
  }, [focusGraph]);
  const [tourIndex, setTourIndex] = useState(0);
  const [step, setStep] = useState(0);
  const [importOpen, setImportOpen] = useState(
    Boolean(
      bridge?.signedIn &&
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("import"),
    ),
  );
  useEffect(() => {
    if (bridge?.signedIn && new URLSearchParams(window.location.search).has("import"))
      setImportOpen(true);
  }, [bridge?.signedIn]);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<SourceAnswer | null>(null);
  const answerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (answer) answerRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [answer]);
  const [audio, setAudio] = useState("");
  const [edit, setEdit] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sharing, setSharing] = useState(false);
  const [email, setEmail] = useState("");
  const tour = analysis.tours[Math.min(tourIndex, analysis.tours.length - 1)];
  const activeStep = tour?.steps[Math.min(step, tour.steps.length - 1)];
  const activePath = view === "tour" ? activeStep?.citation.path : selected;
  const node =
    analysis.nodes.find((n) => n.id === activePath) || analysis.nodes[0];
  const file = analysis.files.find((f) => f.path === node?.id);
  const citation: Citation =
    view === "tour" && activeStep
      ? activeStep.citation
      : {
          path: file?.path || "",
          start: 1,
          end: Math.min(40, file?.content.split("\n").length || 1),
        };
  const row = bridge?.records.find(
    (r) => r.recordId === bridge.currentId,
  )?.data;
  const canEdit =
    !!row &&
    !!bridge?.userId &&
    (row.ownerId === bridge.userId ||
      row.collaborators.includes(bridge.userId));
  const isOwner = !!row && row.ownerId === bridge?.userId;
  const filtered = analysis.nodes.filter((n) =>
    n.id.toLowerCase().includes(search.toLowerCase()),
  );
  const graphNodes = useMemo(
    () =>
      focusGraph
        ? analysis.nodes.filter(
            (n) =>
              n.id === node?.id ||
              analysis.edges.some(
                (e) =>
                  (e.source === node?.id && e.target === n.id) ||
                  (e.target === node?.id && e.source === n.id),
              ),
          )
        : analysis.nodes,
    [analysis, focusGraph, node?.id],
  );
  const positions = useMemo(() => {
    if (focusGraph && node) {
      const importedBy = graphNodes.filter(
        (n) => n.id !== node.id && analysis.edges.some(
          (edge) => edge.source === n.id && edge.target === node.id,
        ),
      );
      const imports = graphNodes.filter(
        (n) => n.id !== node.id && !importedBy.includes(n),
      );
      const centerY = 140;
      const selectedX = importedBy.length ? (imports.length ? 354 : 550) : (imports.length ? 170 : 354);
      return new Map([
        [node.id, { x: selectedX, y: centerY }],
        ...importedBy.map((n, index) => [n.id, { x: 30, y: 140 + index * 91 }] as const),
        ...imports.map((n, index) => [n.id, { x: 670, y: 140 + index * 91 }] as const),
      ]);
    }
    const counts: Record<string, number> = {};
    return new Map(
      graphNodes.map((n) => {
        const y = counts[n.layer] || 0;
        counts[n.layer] = y + 1;
        return [
          n.id,
          { x: layers.indexOf(n.layer) * 218 + 22, y: y * 91 + 52 },
        ];
      }),
    );
  }, [analysis.edges, focusGraph, graphNodes, node]);
  const graphHeight = Math.max(
    420,
    ...[...positions.values()].map((p) => p.y + 115),
  );
  async function act(
    name: string,
    params: Record<string, unknown> = {},
    message = "Done",
  ) {
    if (!bridge) {
      window.location.href = "/home";
      return;
    }
    if (!bridge.signedIn) {
      bridge.login();
      return;
    }
    setBusy(name);
    setNotice("");
    try {
      const data = await bridge.action(name, {
        id: bridge.currentId,
        ...params,
      });
      setNotice(message);
      return data;
    } catch (e) {
      setNotice(
        e instanceof Error ? e.message : "Something went wrong. Try again.",
      );
    } finally {
      setBusy("");
    }
  }
  function choose(path: string) {
    setSelected(path);
    setAnswer(null);
  }
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(
        `${location.origin}/home?analysis=${bridge?.currentId || ""}`,
      );
      setNotice(
        "Link copied. Only published analyses are visible to everyone.",
      );
    } catch {
      setNotice("Copy this page’s URL from your address bar.");
    }
  }
  function download() {
    const blob = new Blob([JSON.stringify(analysis, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${analysis.repository.split("/")[1]}-walkthrough.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    setNotice("Export started. Check your browser’s downloads.");
  }
  const openImport = () => {
    if (bridge && !bridge.signedIn) {
      bridge.login("import");
      return;
    }
    if (!bridge) {
      window.location.href = "/home?import=1";
      return;
    }
    setImportOpen(true);
  };
  return (
    <div className={`rl-shell ${sidebarOpen ? "rl-sidebar-open" : ""}`}>
      <header className="rl-top">
        <button
          className="rl-sidebar-toggle rl-quiet"
          aria-label="Toggle workspace sidebar"
          aria-expanded={sidebarOpen}
          aria-controls="workspace-sidebar"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <PanelLeft size={19} />
        </button>
        <a className="rl-brand" href="/">
          <span className="rl-mark">
            <Layers size={21} />
          </span>
          RepoLens
        </a>
        <div className="rl-top-center">A clearer way into a codebase</div>
        <div className="rl-top-actions">
          <a
            href="https://docs.deep.space"
            target="_blank"
            rel="noreferrer"
            className="rl-powered"
          >
            Built on DeepSpace <ArrowUpRight size={13} />
          </a>
          <button className="rl-primary" onClick={openImport}>
            <Plus size={16} /> Import repository
          </button>
          {bridge?.signedIn && (
            <button className="rl-quiet" onClick={bridge.logout}>
              Sign out
            </button>
          )}
          {bridge && !bridge.signedIn && (
            <button className="rl-quiet" onClick={() => bridge.login()}>
              Sign in
            </button>
          )}
        </div>
      </header>
      <div className="rl-body">
        <aside className="rl-sidebar" id="workspace-sidebar">
          <div className="rl-sidebar-heading">
            Workspace <span>{bridge?.records.length || 1}</span>
          </div>
          <button
            className={"rl-repo " + (!bridge?.currentId ? "active" : "")}
            onClick={() => { bridge?.select(null); setSidebarOpen(false); }}
          >
            <Github size={19} />
            <span>
              threadhunt<small>DeepSpace example</small>
            </span>
            <ChevronRight size={15} />
          </button>
          {bridge?.records.map((r) => (
            <button
              key={r.recordId}
              className={
                "rl-repo " + (bridge.currentId === r.recordId ? "active" : "")
              }
              onClick={() => {
                bridge.select(r.recordId);
                setTourIndex(0);
                setStep(0);
                setSidebarOpen(false);
              }}
            >
              <GitBranch size={17} />
              <span>
                {r.data.repository.split("/")[1]}
                <small>
                  {r.data.status === "complete"
                    ? "Source ready"
                    : r.data.status}
                </small>
              </span>
            </button>
          ))}
          <div className="rl-sidebar-heading rl-gap">Explore</div>
          <button
            className={"rl-nav " + (view === "map" ? "active" : "")}
            onClick={() => { setView("map"); setSidebarOpen(false); }}
          >
            <Layers size={17} />
            Architecture map
          </button>
          <button
            className={"rl-nav " + (view === "tour" ? "active" : "")}
            onClick={() => {
              setView("tour");
              setSidebarOpen(false);
            }}
          >
            <BookOpen size={17} />
            Walkthroughs<span>{analysis.tours.length}</span>
          </button>
          <button
            className={"rl-nav " + (view === "source" ? "active" : "")}
            onClick={() => {
              if (view === "tour" && activeStep) choose(activeStep.citation.path);
              setView("source");
              setSidebarOpen(false);
            }}
          >
            <Code2 size={17} />
            Source explorer
          </button>
          <div className="rl-sidebar-heading rl-gap">
            Modules <span>{analysis.nodes.length}</span>
          </div>
          <label className="rl-search">
            <Search size={14} />
            <input
              aria-label="Find a module"
              placeholder="Find a module…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <div className="rl-file-list">
            {filtered.map((n) => (
              <button
                key={n.id}
                title={n.id}
                className={node?.id === n.id ? "selected" : ""}
                onClick={() => {
                  choose(n.id);
                  if (view === "tour") setView("source");
                  setSidebarOpen(false);
                }}
              >
                <span className={"rl-dot " + n.layer} />
                <span className="rl-file-name">
                  <strong>{n.label}</strong>
                  <small>{n.id.split("/").slice(0, -1).join("/") || "Project root"}</small>
                </span>
              </button>
            ))}
            {!filtered.length && (
              <p className="rl-muted">No matching modules.</p>
            )}
          </div>
          <div className="rl-sidebar-foot">
            <ShieldCheck size={17} />
            <span>
              Evidence comes first
              <small>Every path leads back to source.</small>
            </span>
          </div>
        </aside>
        <main className="rl-main">
          <div className="rl-project-bar">
            <div>
              <div className="rl-breadcrumb">
                <Github size={14} />
                {analysis.repository.split("/")[0]}
                <ChevronRight size={12} />
                <strong>{analysis.repository.split("/")[1]}</strong>
              </div>
              <h1>
                {view === "map"
                  ? "Architecture, connected."
                  : view === "tour"
                    ? "Follow the story."
                    : "Read the evidence."}
              </h1>
              <p>
                {view === "map"
                  ? "Explore the imports. Follow a walkthrough. Check the source."
                  : view === "tour"
                    ? "A guided route through the code, with the source beside you."
                    : "Inspect the exact code behind every architectural connection."}
              </p>
            </div>
            <div className="rl-project-actions">
              {!bridge && (
                <a
                  className="rl-secondary"
                  href="/home?analysis=22c2e718-006e-4206-9d73-0230d7a7152a"
                >
                  <ArrowUpRight size={15} />
                  Live walkthrough
                </a>
              )}
              <button
                className="rl-secondary"
                onClick={download}
                aria-label="Export analysis"
              >
                <Download size={15} />
              </button>
              <button className="rl-secondary" onClick={() => setSharing(true)}>
                <Link2 size={15} />
                Share
              </button>
            </div>
          </div>
          {bridge?.currentId && !row && (
            <div className="rl-progress" role="status">
              {bridge.analysisStatus === "loading"
                ? "Loading this analysis…"
                : "Analysis unavailable. Check the link or ask the owner to share it."}
            </div>
          )}
          {row && row.status !== "complete" && (
            <div
              className={
                "rl-progress " + (row.status === "failed" ? "failed" : "")
              }
              role="status"
            >
              <div>
                {row.status === "failed" ? (
                  <X size={18} />
                ) : (
                  <LoaderCircle size={18} className="rl-spin" />
                )}
                <strong>{row.message}</strong>
              </div>
              <progress max="1" value={row.progress} />
              {row.status === "failed" && (
                <button
                  onClick={() => {
                    setUrl(row.repository);
                    setImportOpen(true);
                  }}
                >
                  Try again
                </button>
              )}
              <small>
                The example stays available below while your repository is
                processed.
              </small>
            </div>
          )}
          <div className="rl-meta">
            <span>
              <GitBranch size={13} />
              {analysis.commit.slice(0, 8)}
            </span>
            <span>{analysis.nodes.length} modules</span>
            <span>{analysis.edges.length} verified imports</span>
            <span className="rl-evidence">
              <ShieldCheck size={13} />
              {row?.analysis
                ? "Commit-pinned analysis"
                : "Curated source example"}
            </span>
          </div>
          <div className="rl-workarea">
            <section className="rl-canvas-panel">
              <div className="rl-canvas-toolbar">
                <div className="rl-tabs">
                  <button
                    className={view === "map" ? "active" : ""}
                    onClick={() => setView("map")}
                  >
                    Architecture
                  </button>
                  <button
                    className={view === "tour" ? "active" : ""}
                    onClick={() => {
                      setView("tour");
                    }}
                  >
                    Walkthrough
                  </button>
                  <button
                    className={view === "source" ? "active" : ""}
                    onClick={() => {
                      if (view === "tour" && activeStep) choose(activeStep.citation.path);
                      setView("source");
                    }}
                  >
                    Source
                  </button>
                </div>
                <span className="rl-toolbar-note">
                  {view === "map"
                    ? "Select a module to inspect"
                    : "Source, always within reach"}
                </span>
              </div>
              {view === "map" && (
                <>
                  <div className="rl-graph-controls">
                    <div>
                      <strong>
                        {focusGraph ? node?.id : "Repository map"}
                      </strong>
                      <span>
                        {graphNodes.length} modules ·{" "}
                        {focusGraph ? "direct connections" : "grouped by layer"}
                      </span>
                    </div>
                    <button
                      className="rl-secondary"
                      aria-pressed={focusGraph}
                      onClick={() => setFocusGraph(!focusGraph)}
                    >
                      <Focus size={15} />
                      {focusGraph ? "Show all modules" : "Focus connections"}
                    </button>
                  </div>
                  <div className="rl-graph-scroll" ref={graphViewport}>
                    <div className={"rl-graph" + (focusGraph ? " is-focused" : "")} style={{ height: graphHeight }}>
                      {focusGraph ? (
                        <div className="rl-focus-labels">
                          <span>Imported by</span>
                          <span>Selected file</span>
                          <span>Imports</span>
                        </div>
                      ) : (
                        <div className="rl-layer-labels">
                          {layers.map((l) => (
                            <span key={l}>
                              <i className={"rl-dot " + l} />
                              {layerNames[l]}
                            </span>
                          ))}
                        </div>
                      )}
                      <svg width="892" height={graphHeight} aria-hidden="true">
                        <defs>
                          <marker
                            id="arrow"
                            viewBox="0 0 10 10"
                            refX="9"
                            refY="5"
                            markerWidth="5"
                            markerHeight="5"
                            orient="auto-start-reverse"
                          >
                            <path
                              d="M 0 0 L 10 5 L 0 10 z"
                              fill="currentColor"
                            />
                          </marker>
                        </defs>
                        {analysis.edges
                          .filter(
                            (e) =>
                              positions.has(e.source) &&
                              positions.has(e.target),
                          )
                          .map((e, i) => {
                            const a = positions.get(e.source)!,
                              b = positions.get(e.target)!;
                            const active =
                              e.source === node?.id || e.target === node?.id;
                            return (
                              <path
                                key={i}
                                className={active ? "active" : ""}
                                d={`M ${a.x + 184} ${a.y + 33} C ${a.x + 222} ${a.y + 33}, ${b.x - 38} ${b.y + 33}, ${b.x} ${b.y + 33}`}
                                markerEnd="url(#arrow)"
                              />
                            );
                          })}
                      </svg>
                      {graphNodes.map((n) => {
                        const p = positions.get(n.id)!;
                        const linked = analysis.edges.some(
                          (e) =>
                            (e.source === node?.id && e.target === n.id) ||
                            (e.target === node?.id && e.source === n.id),
                        );
                        return (
                          <button
                            key={n.id}
                            aria-pressed={node?.id === n.id}
                            className={`rl-module ${n.layer} ${node?.id === n.id ? "selected" : ""} ${linked ? "linked" : ""}`}
                            style={{ left: p.x, top: p.y }}
                            onClick={() => choose(n.id)}
                            title={n.id}
                          >
                            <span className="rl-module-title">
                              <FileCode2 size={16} />
                              {n.label}
                            </span>
                            <small>
                              {n.id.split("/").slice(0, -1).join("/") ||
                                "Project root"}
                            </small>
                            <span className="rl-module-stats">
                              {n.exports.length} exports <i /> {n.lines} lines
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="rl-map-foot">
                    <span>
                      <span className="rl-line-key" />
                      Lines connect resolved local imports only
                    </span>
                    <span>
                      <Maximize2 size={13} />
                      Scroll to explore
                    </span>
                  </div>
                </>
              )}
              {view === "tour" && tour && (
                <div className="rl-tour">
                  <div className="rl-tour-picker">
                    {analysis.tours.map((t, i) => (
                      <button
                        className={tourIndex === i ? "active" : ""}
                        key={i}
                        onClick={() => {
                          setTourIndex(i);
                          setStep(0);
                          setAudio("");
                        }}
                      >
                        <BookOpen size={15} />
                        {t.title}
                      </button>
                    ))}
                  </div>
                  <div className="rl-tour-heading">
                    <span className="rl-pill">
                      {activeStep?.kind === "inference"
                        ? "AI interpretation · citations checked"
                        : "Source-derived walkthrough"}
                    </span>
                    <h2>{tour.title}</h2>
                    <p>{tour.description}</p>
                  </div>
                  <div className="rl-step-track">
                    {tour.steps.map((s, i) => (
                      <button
                        key={i}
                        className={
                          step === i ? "active" : i < step ? "done" : ""
                        }
                        onClick={() => setStep(i)}
                        aria-label={`Step ${i + 1}: ${s.title}`}
                      >
                        {i < step ? <Check size={15} /> : i + 1}
                      </button>
                    ))}
                  </div>
                  {activeStep && (
                    <article className="rl-step">
                      <span>
                        Step {step + 1} of {tour.steps.length}
                      </span>
                      <h3>{activeStep.title}</h3>
                      <p>{activeStep.explanation}</p>
                      <button
                        className="rl-source-chip"
                        onClick={() => {
                          choose(activeStep.citation.path);
                          setView("source");
                        }}
                      >
                        <FileCode2 size={15} />
                        {activeStep.citation.path}
                        <span>
                          L{activeStep.citation.start}–{activeStep.citation.end}
                        </span>
                      </button>
                    </article>
                  )}
                  <div className="rl-tour-controls">
                    <button
                      className="rl-secondary"
                      disabled={step === 0}
                      onClick={() => setStep(step - 1)}
                    >
                      <ArrowLeft size={15} />
                      Previous
                    </button>
                    <button
                      className="rl-primary"
                      disabled={step === tour.steps.length - 1}
                      onClick={() => setStep(step + 1)}
                    >
                      Next step
                      <ArrowRight size={15} />
                    </button>
                  </div>
                  <div className="rl-tour-extras">
                    <button
                      disabled={!!busy || !canEdit}
                      title={
                        !canEdit
                          ? "Import a repository to narrate your own tour"
                          : undefined
                      }
                      onClick={async () => {
                        const r = await act(
                          "narrate-tour",
                          { index: tourIndex },
                          "Narration ready",
                        );
                        if (typeof r?.audioUrl === "string")
                          setAudio(r.audioUrl);
                      }}
                    >
                      <Volume2 size={15} />
                      Narrate tour
                    </button>
                    {canEdit && (
                      <button
                        onClick={() => {
                          setTitle(tour.title);
                          setDescription(tour.description);
                          setEdit(true);
                        }}
                      >
                        Edit introduction
                      </button>
                    )}
                  </div>
                  {audio && <audio controls src={audio} className="rl-audio" />}
                </div>
              )}
              {view === "source" && file && (
                <div className="rl-full-source">
                  <div className="rl-code-title">
                    <FileCode2 size={15} />
                    {file.path}
                    <a
                      href={sourceUrl(analysis, {
                        path: file.path,
                        start: 1,
                        end: node.lines,
                      })}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open on GitHub
                      <ArrowUpRight size={13} />
                    </a>
                  </div>
                  <Code content={file.content} start={1} />
                </div>
              )}
            </section>
            <aside
              className={"rl-inspector" + (inspectorExpanded ? " is-expanded" : "")}
            >
              <div className="rl-inspector-label">
                <span>
                  <Code2 size={16} />
                  Source inspector
                </span>
                <button
                  className="rl-inspector-expand"
                  type="button"
                  aria-label={
                    inspectorExpanded
                      ? "Collapse source inspector"
                      : "Expand source inspector"
                  }
                  aria-pressed={inspectorExpanded}
                  onClick={() => setInspectorExpanded((expanded) => !expanded)}
                >
                  {inspectorExpanded ? <X size={15} /> : <Maximize2 size={15} />}
                  {inspectorExpanded ? "Collapse" : "Expand"}
                </button>
              </div>
              <div className="rl-inspector-summary">
                <span className={"rl-pill " + node?.layer}>
                  {node && layerNames[node.layer]} module
                </span>
                <h2>{node?.label}</h2>
                <p>{node?.id}</p>
                <div className="rl-small-stats">
                  <span>
                    <strong>{node?.lines}</strong> lines
                  </span>
                  <span>
                    <strong>{node?.imports.length}</strong> imports
                  </span>
                  <span>
                    <strong>{node?.exports.length}</strong> exports
                  </span>
                  <span>
                    <strong>{analysis.edges.filter((e) => e.source === node?.id || e.target === node?.id).length}</strong> local links
                  </span>
                </div>
              </div>
              <div className="rl-ask">
                <h3>
                  <Sparkles size={15} />
                  Ask about this file
                </h3>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const r = await act(
                      "ask-source",
                      { question, path: node?.id },
                      "Answer ready",
                    );
                    if (r?.answer && typeof r.answer === "object")
                      setAnswer(r.answer as SourceAnswer);
                  }}
                >
                  <input
                    aria-label="Question about selected file"
                    disabled={!canEdit}
                    placeholder="Where can this file fail?"
                    value={question}
                    maxLength={600}
                    onChange={(e) => setQuestion(e.target.value)}
                  />
                  <button
                    aria-label="Ask about this file"
                    disabled={!!busy || !canEdit || question.trim().length < 8}
                  >
                    {busy === "ask-source" ? "Asking…" : "Ask"}
                  </button>
                </form>
                {!canEdit && (
                  <button className="rl-quiet" onClick={openImport}>
                    Import a repository to use AI
                  </button>
                )}
                <small>
                  Answers use this file only. For a repository overview, use Walkthroughs.
                </small>
              </div>
              {answer && (
                <div className="rl-answer-block" ref={answerRef}>
                  <strong>Source-linked answer</strong>
                  <p className="rl-answer-summary">{answer.summary}</p>
                  <div className="rl-findings">
                    {answer.findings.map((finding, index) => (
                      <div className="rl-finding" key={index}>
                        <h4>{finding.title}</h4>
                        <p>{finding.detail}</p>
                        <a
                          href={sourceUrl(analysis, finding.citation)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {finding.citation.path.split("/").pop()} · L{finding.citation.start}–{finding.citation.end}
                          <ArrowUpRight size={12} />
                        </a>
                      </div>
                    ))}
                  </div>
                  <p className="rl-answer-next"><strong>Next check</strong> {answer.nextStep}</p>
                  <small>{answer.limitation}</small>
                </div>
              )}
              <div className="rl-inspector-section">
                <h3>Connected modules</h3>
                {analysis.edges
                  .filter((e) => e.source === node?.id || e.target === node?.id)
                  .slice(0, 7)
                  .map((e, i) => (
                    <div className="rl-connection-row" key={i}>
                      <button
                        className="rl-connection"
                        onClick={() => {
                          choose(e.source === node?.id ? e.target : e.source);
                          if (view === "tour") setView("map");
                        }}
                        title={e.source === node?.id ? e.target : e.source}
                      >
                        <GitBranch size={14} />
                        <span>
                          {(e.source === node?.id ? e.target : e.source)
                            .split("/")
                            .pop()}
                        </span>
                        <small>
                          {e.source === node?.id ? "imports" : "imported by"}
                        </small>
                      </button>
                      <a
                        href={sourceUrl(analysis, {
                          path: e.source,
                          start: e.line,
                          end: e.line,
                        })}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Open import at ${e.source} line ${e.line}`}
                      >
                        L{e.line} <ArrowUpRight size={11} />
                      </a>
                    </div>
                  ))}
                {!analysis.edges.some(
                  (e) => e.source === node?.id || e.target === node?.id,
                ) && (
                  <p className="rl-muted">
                    No lines for this module: its imports are external or could not be resolved to files in this bounded snapshot.
                  </p>
                )}
              </div>
              <div className="rl-code-title">
                <span>
                  L{citation.start}–{citation.end}
                </span>
                <a
                  href={sourceUrl(analysis, citation)}
                  target="_blank"
                  rel="noreferrer"
                >
                  View source
                  <ArrowUpRight size={13} />
                </a>
              </div>
              {file && (
                <div className="rl-code-preview">
                  <Code
                    content={file.content
                      .split("\n")
                      .slice(citation.start - 1, citation.end)
                      .join("\n")}
                    start={citation.start}
                  />
                </div>
              )}
            </aside>
          </div>
          <footer className="rl-footnote">
            <ShieldCheck size={14} />
            <span>{analysis.warnings.join(" ")}</span>
          </footer>
        </main>
      </div>
      {(notice || busy) && (
        <div className="rl-toast" role="status">
          {busy ? (
            <>
              <LoaderCircle size={16} className="rl-spin" />
              {busy === "analyze-repository"
                ? "Starting analysis…"
                : "Working…"}
            </>
          ) : (
            notice
          )}
          {!busy && <button aria-label="Dismiss notification" onClick={() => setNotice("")}>
            <X size={15} />
          </button>}
        </div>
      )}
      {importOpen && (
        <Modal
          title="Understand your next codebase"
          close={() => setImportOpen(false)}
        >
          <p>
            Import a small public JavaScript or TypeScript repository. We pin
            the commit, parse its imports, and build a source-linked
            walkthrough.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const r = await act(
                "analyze-repository",
                { repository: url },
                "Analysis started",
              );
              if (typeof r?.id === "string") {
                bridge?.select(r.id);
                setImportOpen(false);
              }
            }}
          >
            <label>
              GitHub repository
              <input
                autoFocus
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://github.com/owner/repository"
                required
              />
            </label>
            <div className="rl-import-facts">
              <span>
                <ShieldCheck size={15} />
                Public source only
              </span>
              <span>Up to 32 files</span>
              <span>5 imports per day</span>
            </div>
            <button className="rl-primary" disabled={!!busy}>
              <GitBranch size={16} />
              Analyze repository
            </button>
          </form>
        </Modal>
      )}
      {sharing && (
        <Modal title="Share the understanding" close={() => setSharing(false)}>
          {!bridge?.currentId ? (
            <>
              <p>
                This example is available to everyone. Import a repository to
                publish your own analysis.
              </p>
              <button
                className="rl-primary"
                onClick={() => {
                  setSharing(false);
                  openImport();
                }}
              >
                Import a repository
              </button>
            </>
          ) : (
            <>
              <p>
                {row?.published
                  ? "A published snapshot is visible to anyone with its link. Later draft edits stay private."
                  : "This analysis is private. Publish it to let anyone with the link read it."}
              </p>
              {isOwner && (
                <button
                  className="rl-primary"
                  disabled={!!busy}
                  onClick={() =>
                    act(
                      "publish-analysis",
                      { published: !row?.published },
                      row?.published
                        ? "Analysis made private"
                        : "Analysis published",
                    )
                  }
                >
                  {row?.published ? "Make private" : "Publish analysis"}
                </button>
              )}
              <button className="rl-secondary" onClick={copyLink}>
                <Copy size={15} />
                Copy link
              </button>
              {isOwner && (
                <form
                  className="rl-invite"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await act("invite-reviewer", { email }, "Reviewer added");
                  }}
                >
                  <label>
                    Invite a reviewer by sign-in email
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="developer@example.com"
                    />
                  </label>
                  <small>
                    They must sign in once first. Reviewers can edit tour
                    introductions.
                  </small>
                  <button className="rl-secondary" disabled={!!busy}>
                    Add reviewer
                  </button>
                </form>
              )}
            </>
          )}
        </Modal>
      )}
      {edit && (
        <Modal title="Edit the walkthrough" close={() => setEdit(false)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const r = await act(
                "save-tour",
                { index: tourIndex, title, description },
                "Walkthrough saved",
              );
              if (r) setEdit(false);
            }}
          >
            <label>
              Title
              <input
                value={title}
                maxLength={100}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label>
              Introduction
              <textarea
                value={description}
                maxLength={1500}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <button className="rl-primary" disabled={!!busy}>
              Save changes
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
function Code({ content, start }: { content: string; start: number }) {
  return (
    <pre className="rl-code">
      {content.split("\n").map((line, i) => (
        <div key={i}>
          <span className="rl-line-number">{start + i}</span>
          <code>
            {line
              .split(
                /("[^"\n]*"|'[^'\n]*'|\b(?:import|from|export|const|return|function|async|await|class|interface|type|if|new)\b)/g,
              )
              .map((part, j) => (
                <span
                  key={j}
                  className={
                    /^['"]/.test(part)
                      ? "rl-string"
                      : /^(import|from|export|const|return|function|async|await|class|interface|type|if|new)$/.test(
                            part,
                          )
                        ? "rl-keyword"
                        : ""
                  }
                >
                  {part}
                </span>
              ))}
          </code>
        </div>
      ))}
    </pre>
  );
}
function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  const dialog = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current
      ?.querySelector<HTMLElement>("input, textarea, button")
      ?.focus();
    return () => previous?.focus();
  }, []);
  return (
    <div
      className="rl-modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") close();
        if (e.key === "Tab") {
          const elements = dialog.current?.querySelectorAll<HTMLElement>(
            "button:not(:disabled), input, textarea, a[href]",
          );
          if (!elements?.length) return;
          const first = elements[0],
            last = elements[elements.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }}
    >
      <section
        ref={dialog}
        className="rl-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <button
          className="rl-modal-close"
          aria-label="Close dialog"
          onClick={close}
        >
          <X size={20} />
        </button>
        <span className="rl-mark">
          <Layers size={24} />
        </span>
        <h2>{title}</h2>
        {children}
      </section>
    </div>
  );
}
