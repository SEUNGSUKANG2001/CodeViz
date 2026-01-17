"use client";

import { useEffect, useState } from "react";
import type { ProjectDetailResponse, ResultUrlResponse, GraphData } from "@/lib/types";
import { apiFetch } from "@/lib/api";

type Props = {
  project: ProjectDetailResponse["data"]["project"] | null;
  loading?: boolean;
};

export function ThreeViewer({ project, loading }: Props) {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [graphLoading, setGraphLoading] = useState(false);
  const [graphError, setGraphError] = useState<string | null>(null);

  const jobStatus = project?.latestJob?.status;
  const jobId = project?.latestJob?.id;
  const progress = project?.latestJob?.progress;

  // Fetch graph data when job is done
  useEffect(() => {
    if (jobStatus !== "done" || !jobId) {
      setGraphData(null);
      return;
    }

    let cancelled = false;

    async function fetchGraph() {
      setGraphLoading(true);
      setGraphError(null);

      try {
        // 1. Get presigned URL from API
        const urlRes = await apiFetch<ResultUrlResponse>(
          `/api/v1/analysis-jobs/${jobId}/result-url`
        );

        // 2. Fetch graph.json using presigned URL
        const graphRes = await fetch(urlRes.data.url);
        if (!graphRes.ok) {
          throw new Error("Failed to fetch graph data");
        }

        const data: GraphData = await graphRes.json();
        if (!cancelled) {
          setGraphData(data);
        }
      } catch (e) {
        if (!cancelled) {
          const error = e as Error;
          setGraphError(error.message ?? "Failed to load graph");
        }
      } finally {
        if (!cancelled) {
          setGraphLoading(false);
        }
      }
    }

    fetchGraph();

    return () => {
      cancelled = true;
    };
  }, [jobStatus, jobId]);

  return (
    <div className="relative h-full bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70">
        {loading ? (
          <div className="text-center">
            <div className="mb-2 text-lg">Loading project...</div>
          </div>
        ) : jobStatus === "queued" || jobStatus === "running" ? (
          <div className="text-center">
            <div className="mb-2 text-lg">
              {jobStatus === "queued" ? "Job queued..." : "Analyzing repository..."}
            </div>
            {progress !== null && progress !== undefined && (
              <div className="w-48 rounded-full bg-slate-700">
                <div
                  className="h-2 rounded-full bg-blue-500 transition-all"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
            )}
            <div className="mt-2 text-sm">
              {project?.latestJob?.message ?? "Processing..."}
            </div>
          </div>
        ) : jobStatus === "failed" ? (
          <div className="text-center text-red-400">
            <div className="mb-2 text-lg">Analysis failed</div>
            <div className="text-sm">Please try again or check the repository URL</div>
          </div>
        ) : graphLoading ? (
          <div className="text-center">
            <div className="mb-2 text-lg">Loading visualization...</div>
          </div>
        ) : graphError ? (
          <div className="text-center text-red-400">
            <div className="mb-2 text-lg">Failed to load graph</div>
            <div className="text-sm">{graphError}</div>
          </div>
        ) : graphData ? (
          <div className="text-center">
            <div className="mb-4 text-6xl">🏙️</div>
            <div className="text-lg">3D Viewer Placeholder</div>
            <div className="mt-2 text-sm text-white/50">
              Three.js will render here
            </div>
            <div className="mt-4 rounded bg-slate-700/50 px-3 py-2 text-xs">
              Loaded: {graphData.nodes.length} nodes, {graphData.edges.length} edges
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="mb-4 text-6xl">📊</div>
            <div className="text-lg">No visualization available</div>
            <div className="mt-2 text-sm text-white/50">
              Submit a repository to analyze
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
