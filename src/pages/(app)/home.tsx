import { useState } from "react";
import { AuthOverlay, getAuthToken, useAuth, useQuery } from "deepspace";
import { useSearchParams } from "react-router-dom";
import Workspace from "../../repolens/Workspace";
import example from "../../repolens/example.json";
import type { Analysis, AnalysisRow } from "../../repolens/model";
export default function Home() {
  const auth = useAuth();
  const [params, setParams] = useSearchParams();
  const currentId = params.get("analysis");
  const [login, setLogin] = useState(params.has("import") && !auth.isSignedIn);
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
  const records = [
    ...drafts,
    ...snapshots.filter((s) => !drafts.some((d) => d.recordId === s.recordId)),
  ];
  const row = records.find((r) => r.recordId === currentId);
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
        key={row?.data.analysis?.commit || "example"}
        analysis={row?.data.analysis || (example as Analysis)}
        bridge={{
          signedIn: auth.isSignedIn,
          userId: auth.userId,
          records,
          currentId,
          select: (id) => setParams(id ? { analysis: id } : {}),
          login: () => setLogin(true),
          action,
        }}
      />
      {login && <AuthOverlay onClose={() => setLogin(false)} />}
    </>
  );
}
