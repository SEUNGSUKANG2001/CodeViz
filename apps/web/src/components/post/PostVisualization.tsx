"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { GraphData, ResultUrlResponse, PlanetSummary } from "@/lib/types";
import { apiFetch } from "@/lib/api";
import type { ThemeType } from "@/components/viewer/useCodeCityViewer";
import { cn } from "@/lib/utils";
import type { CommitInfo, Snapshot } from "@/lib/types";
import { ControlsPanel } from "@/components/viewer/ControlsPanel";
import Link from "next/link";

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
  planet?: PlanetSummary | null;
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
  snapshots = [],
  planet = null,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [activeGraphData, setActiveGraphData] = useState<GraphData | null>(null);
  const [graphLoading, setGraphLoading] = useState(false);
  const [graphError, setGraphError] = useState<string | null>(null);
  const [viewerReady, setViewerReady] = useState(false);

  const [currentTheme, setCurrentTheme] = useState<ThemeType>(initialTheme);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [uiHidden, setUiHidden] = useState(false);
  const [selectedCityNode, setSelectedCityNode] = useState<{
    id: string;
    lineCount: number;
    imports: string[];
    usedBy: string[];
  } | null>(null);
  const [cityFocusTarget, setCityFocusTarget] = useState<{
    point: [number, number, number];
    normal: [number, number, number];
  } | null>(null);

  const placement = useMemo(() => {
    const anchor = (planet?.params as any)?.cityAnchor;
    if (anchor?.point && anchor?.normal) {
      return {
        point: anchor.point as [number, number, number],
        normal: anchor.normal as [number, number, number],
      };
    }
    if (planet) {
      return {
        point: [0, 1, 0],
        normal: [0, 1, 0],
      };
    }
    return null;
  }, [planet]);

  const planets = useMemo(() => {
    if (!planet) return [];
    return [planet];
  }, [planet]);

  const handleCityNodeSelect = useMemo(() => {
    return (
      nodeId: string,
      position: { x: number; y: number; z: number },
      normal: { x: number; y: number; z: number }
    ) => {
      if (!activeGraphData) return;
      const node = activeGraphData.nodes.find((n: any) => n.id === nodeId);
      const edges = activeGraphData.edges || (activeGraphData as any).links || [];
      const imports: string[] = [];
      const usedBy: string[] = [];
      edges.forEach((edge: any) => {
        const sId = typeof edge.source === "object" ? edge.source.id : edge.source;
        const tId = typeof edge.target === "object" ? edge.target.id : edge.target;
        if (sId === nodeId) imports.push(tId);
        if (tId === nodeId) usedBy.push(sId);
      });
      setSelectedCityNode({
        id: nodeId,
        lineCount: (node as any)?.lines ?? (node as any)?.lineCount ?? (node as any)?.loc ?? 0,
        imports,
        usedBy,
      });
      setCityFocusTarget({
        point: [position.x, position.y, position.z],
        normal: [normal.x, normal.y, normal.z],
      });
    };
  }, [activeGraphData]);

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
        onWheelCapture={(e) => {
          e.preventDefault();
        }}
        onTouchMoveCapture={(e) => {
          e.preventDefault();
        }}
      >
        <div className="absolute inset-0">
          {activeGraphData && (
            <LandingScene
              mode="main"
              planets={planets}
              activePlanetId={planet?.id ?? null}
              placementMode={false}
              placement={placement}
              focusId={planet?.id ?? null}
              shipLandingActive={false}
              shipTestMode={false}
              shipLandingKey={0}
              cityBuilt={true}
              cityGraphData={activeGraphData}
              cityTheme={currentTheme}
              enableOrbit={true}
              selectedNodeId={selectedCityNode?.id ?? null}
              onCityNodeSelect={handleCityNodeSelect}
              cityFocusTarget={cityFocusTarget}
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

        {immersive && (
          <>
            <div className="pointer-events-auto absolute inset-x-0 top-0 z-40 border-b border-white/10 bg-black/50 px-6 py-4 backdrop-blur-md">
              <div className="mx-auto flex max-w-[1600px] items-center justify-between">
                <div className="flex items-center gap-4">
                  <Link href="/" className="flex items-center gap-3">
                    <div className="relative h-8 w-8 rounded-none border border-white/20 bg-white/10">
                      <div className="absolute left-2 top-2 h-1.5 w-1.5 rounded-full bg-cyan-300" />
                    </div>
                    <span className="text-sm font-semibold tracking-[0.18em] text-white">CODEVIZ</span>
                  </Link>
                  <span className="text-white/20">/</span>
                  <div className="text-sm font-medium text-white/90">{title}</div>
                  {jobStatus && (
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white/70">
                      Job: {jobStatus}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href="/feed"
                    className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs text-white/80"
                  >
                    Explore
                  </Link>
                  <button
                    onClick={() => setUiHidden((prev) => !prev)}
                    className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs text-white/80"
                  >
                    {uiHidden ? "Show UI" : "Hide UI"}
                  </button>
                  {onClose && (
                    <button
                      onClick={onClose}
                      className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs text-white/80"
                    >
                      Close
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/40 px-6 py-3 backdrop-blur-md">
              <div className="mx-auto flex max-w-[1600px] items-center justify-between text-xs text-white/70">
                <span>3D City View · Drag to orbit · Scroll to zoom</span>
                <span>Theme: {currentTheme}</span>
              </div>
            </div>

            <div
              className="pointer-events-auto absolute right-0 top-[68px] z-40 h-[calc(100vh-68px)] w-[360px] transition-transform duration-[1200ms] ease-in-out"
              style={{
                transform: uiHidden ? "translateX(110%)" : "translateX(0)",
                pointerEvents: uiHidden ? "none" : "auto",
              }}
            >
              <ControlsPanel
                project={null}
                theme={currentTheme}
                onThemeChange={setCurrentTheme}
                selectedNode={selectedCityNode}
              />
            </div>

            {activeGraphData?.history && activeGraphData.history.length > 0 && (
              <div
                className="pointer-events-auto absolute bottom-24 left-1/2 z-40 w-[520px] -translate-x-1/2 border border-white/10 bg-black/40 px-4 py-3 backdrop-blur-md transition-transform duration-[1200ms] ease-in-out"
                style={{
                  transform: `translate(-50%, ${uiHidden ? "160%" : "0"})`,
                  opacity: uiHidden ? 0 : 1,
                  pointerEvents: uiHidden ? "none" : "auto",
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                onPointerMove={(e) => e.stopPropagation()}
                onWheel={(e) => e.stopPropagation()}
              >
                <div className="mb-2 flex items-center justify-between text-xs text-white/70">
                  <span>
                    {historyIndex === -1
                      ? "Latest"
                      : (() => {
                          const entry = activeGraphData.history?.[historyIndex] as any;
                          if (entry?.timestamp) {
                            return new Date(entry.timestamp * 1000).toLocaleDateString();
                          }
                          if (entry?.date) {
                            return new Date(entry.date).toLocaleDateString();
                          }
                          return "Snapshot";
                        })()}
                  </span>
                  <span className="text-white/50">
                    {historyIndex === -1
                      ? "Initial layout"
                      : (() => {
                          const entry = activeGraphData.history?.[historyIndex] as any;
                          return entry?.message || entry?.hash || "Snapshot";
                        })()}
                  </span>
                </div>
                {(() => {
                  const history = activeGraphData.history || [];
                  const L = history.length;
                  const sliderValue = historyIndex === -1 ? L : (L - 1) - historyIndex;
                  const handleChange = (val: number) => {
                    setHistoryIndex(val === L ? -1 : (L - 1) - val);
                  };
                  return (
                    <input
                      type="range"
                      min="0"
                      max={L}
                      value={sliderValue}
                      onChange={(e) => handleChange(parseInt(e.target.value, 10))}
                      onInput={(e) => handleChange(parseInt((e.target as HTMLInputElement).value, 10))}
                      className="w-full accent-cyan-300"
                    />
                  );
                })()}
              </div>
            )}
          </>
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
