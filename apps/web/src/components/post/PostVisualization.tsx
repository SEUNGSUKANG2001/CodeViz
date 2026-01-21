"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { GraphData, ResultUrlResponse } from "@/lib/types";
import { apiFetch } from "@/lib/api";
import type { ThemeType } from "@/components/viewer/useCodeCityViewer";
import { cn } from "@/lib/utils";
import type { CommitInfo, Snapshot } from "@/lib/types";

const LandingScene = dynamic<any>(() => import("@/components/planet/LandingScene"), { ssr: false });

type Props = {
  jobId?: string | null;
  jobStatus?: string | null;
  coverUrl?: string | null;
  title: string;
  theme?: ThemeType;
  immersive?: boolean;
  onClose?: () => void;
  projectId?: string | null;
  history?: CommitInfo[];
  snapshots?: Snapshot[];
};

const THEMES: { id: ThemeType; label: string; icon: string }[] = [
  { id: "Thema1", label: "Thema 1", icon: "🏙️" },
  { id: "Thema2", label: "Thema 2", icon: "🌌" },
  { id: "Thema3", label: "Thema 3", icon: "🌲" },
];

function buildGraphFromFiles(files: Record<string, any>) {
  const nodes = Object.entries(files).map(([path, info]) => ({
    id: path,
    name: path.split("/").pop() || path,
    path,
    type: "file",
    lines: info.line_count ?? info.lineCount ?? info.linecount ?? 10,
  }));
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges: any[] = [];
  Object.entries(files).forEach(([sourcePath, info]) => {
    const deps = info.depends_on || info.dependsOn || [];
    deps.forEach((dep: any) => {
      const targetId = dep.target || dep.id || dep.path;
      if (!targetId) return;
      if (!nodeIds.has(targetId)) {
        nodeIds.add(targetId);
        nodes.push({
          id: targetId,
          name: targetId.split("/").pop() || targetId,
          path: targetId,
          type: "file",
          lines: 10,
        });
      }
      edges.push({ source: sourcePath, target: targetId, type: dep.type || "import" });
    });
  });
  return { nodes, edges };
}

function normalizeGraphData(data: GraphData): GraphData {
  if (data?.nodes?.length) return data;
  const history = (data as any)?.history;
  if (Array.isArray(history) && history.length > 0) {
    const latest = history[history.length - 1];
    if (latest?.files) {
      return { ...data, ...buildGraphFromFiles(latest.files) };
    }
  }
  const snapshots = data?.snapshots;
  if (Array.isArray(snapshots) && snapshots.length > 0) {
    const latest = snapshots[snapshots.length - 1];
    if (latest?.files) {
      return { ...data, ...buildGraphFromFiles(latest.files) };
    }
  }
  return data;
}

export function PostVisualization({
  jobId,
  jobStatus,
  coverUrl,
  title,
  theme: initialTheme = "Thema1",
  immersive = false,
  onClose,
  history = [],
  snapshots = []
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [activeGraphData, setActiveGraphData] = useState<GraphData | null>(null);
  const [graphLoading, setGraphLoading] = useState(false);
  const [graphError, setGraphError] = useState<string | null>(null);
  const [viewerReady, setViewerReady] = useState(false);

  const [currentTheme, setCurrentTheme] = useState<ThemeType>(initialTheme);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    if (!graphData) {
      setActiveGraphData(null);
      return;
    }

    if (historyIndex === -1 || !graphData.history || graphData.history.length === 0) {
      setActiveGraphData(graphData);
    } else {
      const targetCommit = graphData.history[historyIndex] as any;
      const snapshot = graphData.snapshots?.find((s) => s.hash === targetCommit.hash);

      if (snapshot?.files) {
        setActiveGraphData({ ...graphData, ...buildGraphFromFiles(snapshot.files) });
      } else if (targetCommit?.files) {
        setActiveGraphData({ ...graphData, ...buildGraphFromFiles(targetCommit.files) });
      } else {
        setActiveGraphData(graphData);
      }
    }
  }, [graphData, historyIndex]);

  useEffect(() => {
    if (jobStatus !== "done" || !jobId) {
      setGraphData(null);
      setViewerReady(false);
      return;
    }

    let cancelled = false;

    async function fetchGraph() {
      setGraphLoading(true);
      setGraphError(null);

      try {
        const urlRes = await apiFetch<ResultUrlResponse>(
          `/api/v1/analysis-jobs/${jobId}/result-url`
        );
        const graphRes = await fetch(urlRes.data.url);
        if (!graphRes.ok) throw new Error("Failed to fetch graph data");
        const raw = (await graphRes.json()) as GraphData;
        const data: GraphData = {
          ...raw,
          history: raw.history ?? history,
          snapshots: raw.snapshots ?? snapshots,
        };
        const normalized = normalizeGraphData(data);
        if (!cancelled) {
          setGraphData(normalized);
          setViewerReady(true);
        }
      } catch (e) {
        if (!cancelled) {
          const error = e as Error;
          setGraphError(error.message ?? "Failed to load graph");
        }
      } finally {
        if (!cancelled) setGraphLoading(false);
      }
    }

    fetchGraph();
    return () => {
      cancelled = true;
    };
  }, [jobId, jobStatus]);

  useEffect(() => {
    if (!graphData) return;
    setGraphData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        history: prev.history ?? history,
        snapshots: prev.snapshots ?? snapshots,
      };
    });
  }, [history, snapshots, graphData]);

  if (!jobId || jobStatus !== "done" || graphError) {
    return (
      <div className="aspect-[16/9] w-full overflow-hidden rounded-3xl border border-white/5 bg-[#121212]">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div
            className="h-full w-full bg-gradient-to-br from-indigo-500/10 via-black to-black"
          />
        )}
      </div>
    );
  }

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const preventScroll = (event: Event) => {
      event.preventDefault();
    };
    el.addEventListener("wheel", preventScroll, { passive: false });
    el.addEventListener("touchmove", preventScroll, { passive: false });
    return () => {
      el.removeEventListener("wheel", preventScroll);
      el.removeEventListener("touchmove", preventScroll);
    };
  }, []);

  return (
    <>
      <div
        ref={containerRef}
        className={cn(
        "relative w-full overflow-hidden transition-all duration-700 ease-in-out",
        immersive
          ? "fixed inset-0 z-50 rounded-none bg-black"
          : "aspect-[16/9] rounded-3xl border border-white/10 bg-black shadow-2xl"
      )}
      >
        <div className="absolute inset-0">
          {activeGraphData && (
            <LandingScene
              mode="main"
              planets={[]}
              activePlanetId={null}
              placementMode={false}
              shipLandingActive={false}
              shipTestMode={false}
              shipLandingKey={0}
              cityBuilt={true}
              cityGraphData={activeGraphData}
              cityTheme={currentTheme}
              enableOrbit={true}
            />
          )}
        </div>

        {(graphLoading || !activeGraphData) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-20">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 animate-bounce rounded-full bg-indigo-500" />
              <div className="h-2 w-2 animate-bounce rounded-full bg-indigo-500 [animation-delay:0.2s]" />
              <div className="h-2 w-2 animate-bounce rounded-full bg-indigo-500 [animation-delay:0.4s]" />
            </div>
            <span className="mt-4 text-xs font-medium tracking-widest text-white/40 uppercase">Initialising Universe</span>
          </div>
        )}

        {/* Top Control Bar (Themes) - Immersive only */}
        {immersive && (
          <div className="absolute left-0 right-0 top-0 z-40 p-6 animate-in slide-in-from-top duration-500">
            <div className="mx-auto flex max-w-fit items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-2 backdrop-blur-xl">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setCurrentTheme(t.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all",
                    currentTheme === t.id
                      ? "bg-white text-black scale-105"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
              <div className="mx-2 h-4 w-px bg-white/10" />
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
              >
                &times;
              </button>
            </div>
          </div>
        )}

        {/* Bottom Control Bar (Timeline) - Immersive only */}
        {immersive && viewerReady && graphData?.history && graphData.history.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 z-40 p-8 animate-in slide-in-from-bottom duration-500">
            <div className="mx-auto max-w-3xl space-y-4 rounded-3xl border border-white/10 bg-black/40 p-6 backdrop-blur-xl shadow-2xl">
              <div className="flex items-center justify-between text-xs font-medium uppercase tracking-[0.2em] text-white/40">
                <div className="flex items-center gap-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                  <span>Time Machine</span>
                </div>
                <span>{historyIndex === -1 ? "Origin / Latest" : new Date(graphData.history[historyIndex].timestamp * 1000).toLocaleDateString()}</span>
              </div>

              <div className="relative pt-2">
                <input
                  type="range"
                  min="0"
                  max={graphData.history.length}
                  value={historyIndex === -1 ? graphData.history.length : (graphData.history.length - 1) - historyIndex}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    const L = graphData.history!.length;
                    setHistoryIndex(val === L ? -1 : (L - 1) - val);
                  }}
                  className="w-full cursor-pointer accent-white"
                  style={{
                    height: '4px',
                    appearance: 'none',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '2px',
                    outline: 'none'
                  }}
                />
              </div>

              {historyIndex !== -1 && (
                <div className="text-center text-sm text-white/60 italic font-mono truncate px-4">
                  "{graphData.history[historyIndex].message}"
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Backdrop blur the rest of the page when immersive */}
      {immersive && (
        <style dangerouslySetInnerHTML={{
          __html: `
          body { overflow: hidden !important; }
        ` }} />
      )}
    </>
  );
}
