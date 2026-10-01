import { useEffect, useRef, useState } from "react";
import {
  AuthOverlay,
  getAuthToken,
  signOut,
  useAuth,
  useQuery,
} from "deepspace";
import { useNavigate, useSearchParams } from "react-router-dom";
import Workspace from "../../repolens/Workspace";
import example from "../../repolens/example.json";
import type { Analysis, AnalysisRow } from "../../repolens/model";
export default function Home() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const currentId = params.get("analysis");
  const [login, setLogin] = useState(params.has("import") && !auth.isSignedIn);
  useEffect(() => {
    if (auth.isSignedIn) setLogin(false);
    else if (login && !sessionStorage.getItem("repolens:returnTo"))
      sessionStorage.setItem("repolens:returnTo", window.location.pathname + window.location.search);
  }, [auth.isSignedIn, login]);
  const { records: drafts } = useQuery<AnalysisRow>("analyses", {
    orderBy: "createdAt",
    orderDir: "desc",
    limit: 30,
  });
  const { records: snapshots } = useQuery<AnalysisRow>("publishedAnalyses", {
    orderBy: "createdAt",
    orderDir: "desc",
    limit: 30,
  });
  const { records: directDrafts, status: draftStatus } = useQuery<AnalysisRow>("analyses", {
    where: { recordId: currentId || "__no_analysis__" },
    limit: 1,
  });
  const { records: directSnapshots, status: snapshotStatus } = useQuery<AnalysisRow>("publishedAnalyses", {
    where: { recordId: currentId || "__no_analysis__" },
    limit: 1,
  });
  useEffect(() => {
    if (!auth.isSignedIn) return;
    const returnTo = sessionStorage.getItem("repolens:returnTo");
    if (!returnTo) return;
    sessionStorage.removeItem("repolens:returnTo");
    if (returnTo.startsWith("/home") && (returnTo.length === 5 || /[?#]/.test(returnTo[5]))) {
      navigate(returnTo, { replace: true });
    }
  }, [auth.isSignedIn, navigate]);
  const records = [...directDrafts, ...directSnapshots, ...drafts, ...snapshots]
    .filter((record, index, all) => all.findIndex((other) => other.recordId === record.recordId) === index);
  const row = records.find((record) => record.recordId === currentId);
  const analysisStatus = draftStatus === "loading" || snapshotStatus === "loading" ? "loading" : "ready";
  function openLogin(intent?: "import") {
    const destination = new URL(window.location.href);
    if (intent === "import") destination.searchParams.set("import", "1");
    sessionStorage.setItem("repolens:returnTo", destination.pathname + destination.search + destination.hash);
    setLogin(true);
  }
  async function action(name: string, params: Record<string, unknown>) {
    const token = await getAuthToken();
    if (!token) throw new Error("Sign in to continue.");
    const response = await fetch(`/api/actions/${name}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    });
    const result = (await response.json()) as {
      success: boolean;
      error?: string;
      data?: Record<string, unknown>;
    };
    if (!response.ok || !result.success)
      throw new Error(result.error || "The action could not complete.");
    return result.data || {};
  }
  return (
    <>
      <Workspace
        key={currentId || "example"}
        analysis={row?.data.analysis ? {
          ...row.data.analysis,
          tours: row.data.analysis.tours.filter((tour) => tour.steps.every((step) => step.kind === "source")),
        } : (example as Analysis)}
        bridge={{
          signedIn: auth.isSignedIn,
          userId: auth.userId,
          records,
          currentId,
          analysisStatus,
          select: (id) => setParams((previous) => {
            const next = new URLSearchParams(previous);
            if (id) next.set("analysis", id);
            else next.delete("analysis");
            return next;
          }),
          login: openLogin,
          logout: () => {
            void signOut();
          },
          action,
        }}
      />
      {login && <AccessibleAuthOverlay close={() => {
        sessionStorage.removeItem("repolens:returnTo");
        setLogin(false);
      }} />}
    </>
  );
}

function AccessibleAuthOverlay({ close }: { close: () => void }) {
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const focusFirst = () => dialog.current?.querySelector<HTMLElement>("button:not(:disabled), input:not(:disabled)")?.focus();
    const frame = requestAnimationFrame(focusFirst);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
      if (event.key !== "Tab") return;
      const elements = [...(dialog.current?.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), a[href]") || [])];
      if (!elements.length) return;
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.current?.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.current?.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown, true);
      previous?.focus();
    };
  }, [close]);
  return <div ref={dialog} role="dialog" aria-modal="true" aria-label="Sign in to RepoLens" style={{ position: "fixed", inset: 0, zIndex: 99998 }}>
    <AuthOverlay onClose={close} title="Sign in to RepoLens" description="Import and explore a repository" />
  </div>;
}
