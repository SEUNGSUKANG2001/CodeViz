"use client";

import { useEffect, useState, useRef } from "react";
import type { ProjectDetailResponse, ResultUrlResponse, GraphData } from "@/lib/types";
import { apiFetch } from "@/lib/api";
import { useCodeCityViewer, ThemeType } from "./useCodeCityViewer";

type Props = {
  project: ProjectDetailResponse["data"]["project"] | null;
  loading?: boolean;
  theme?: ThemeType;
  onThemeChange?: (theme: ThemeType) => void;
};

export function ThreeViewer({ project, loading, theme = "Thema1", onThemeChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [graphLoading, setGraphLoading] = useState(false);
  const [graphError, setGraphError] = useState<string | null>(null);
  const [viewerReady, setViewerReady] = useState(false);

  const jobStatus = project?.latestJob?.status;
  const jobId = project?.latestJob?.id;
  const progress = project?.latestJob?.progress;

  // Initialize the 3D viewer
  const { resetCamera } = useCodeCityViewer(
    containerRef,
    viewerReady ? graphData : null,
    { theme }
  );

  // Fetch graph data when job is done
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

        const data: GraphData = await graphRes.json();
        if (!cancelled) {
          setGraphData(data);
          // Small delay to ensure container is ready
          setTimeout(() => {
            if (!cancelled) setViewerReady(true);
          }, 100);
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
  }, [jobStatus, jobId]);

  // Show loading states
  const showOverlay =
    loading ||
    jobStatus === "queued" ||
    jobStatus === "running" ||
    jobStatus === "failed" ||
    graphLoading ||
    graphError ||
    !graphData;

  return (
    <div className="relative h-full bg-[#87CEEB]">
      {/* 3D Viewer Container */}
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ visibility: viewerReady && graphData ? "visible" : "hidden" }}
      />

      {/* Status Overlay */}
      {showOverlay && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative h-full w-full m-8 rounded-2xl bg-neutral-100 overflow-hidden flex items-center justify-center">
            <div className="text-neutral-600">
              {loading ? (
                <StatusBlock title="Loading project..." />
              ) : jobStatus === "queued" || jobStatus === "running" ? (
                <div className="text-center">
                  <div className="mb-2 text-lg font-medium">
                    {jobStatus === "queued" ? "Job queued..." : "Analyzing repository..."}
                  </div>

                  {progress !== null && progress !== undefined && (
                    <div className="mt-3 w-48 h-1.5 rounded-full bg-neutral-200 overflow-hidden mx-auto">
                      <div
                        className="h-full rounded-full bg-indigo-500 transition-all"
                        style={{ width: `${Math.round(progress * 100)}%` }}
                      />
                    </div>
                  )}

                  <div className="mt-3 text-sm text-neutral-500">
                    {project?.latestJob?.message ?? "Processing..."}
                  </div>
                </div>
              ) : jobStatus === "failed" ? (
                <div className="text-center">
                  <div className="mb-2 text-lg font-medium text-red-600">Analysis failed</div>
                  <div className="text-sm text-neutral-500">Please try again or check the repository URL</div>
                </div>
              ) : graphLoading ? (
                <StatusBlock title="Loading visualization..." />
              ) : graphError ? (
                <div className="text-center">
                  <div className="mb-2 text-lg font-medium text-red-600">Failed to load graph</div>
                  <div className="text-sm text-neutral-500">{graphError}</div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="mb-4 text-6xl">📊</div>
                  <div className="text-lg font-medium text-neutral-900">No visualization available</div>
                  <div className="mt-2 text-sm text-neutral-500">
                    Submit a repository to analyze
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Viewer Controls - show when visualization is ready */}
      {viewerReady && graphData && (
        <div className="absolute bottom-6 left-6 flex gap-2">
          <button
            onClick={resetCamera}
            className="rounded-full bg-white/90 px-4 py-2 text-sm text-neutral-700 shadow-sm hover:bg-white transition"
          >
            Reset View
          </button>
          <div className="rounded-full bg-white/90 px-4 py-2 text-xs text-neutral-500 shadow-sm">
            {graphData.nodes.length} nodes · {graphData.edges.length} edges
          </div>
        </div>
      )}

      {/* Theme indicator */}
      {viewerReady && graphData && (
        <div className="absolute top-6 right-6 rounded-full bg-white/90 px-3 py-1.5 text-xs text-neutral-500 shadow-sm">
          Theme: {theme}
        </div>
      )}
    </div>
  );
}

function StatusBlock({ title }: { title: string }) {
  return (
    <div className="text-center">
      <div className="mb-3">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
      <div className="text-lg font-medium text-neutral-900">{title}</div>
    </div>
  );
}
