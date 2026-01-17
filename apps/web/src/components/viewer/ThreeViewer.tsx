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
        const urlRes = await apiFetch<ResultUrlResponse>(
          `/api/v1/analysis-jobs/${jobId}/result-url`
        );

        const graphRes = await fetch(urlRes.data.url);
        if (!graphRes.ok) throw new Error("Failed to fetch graph data");

        const data: GraphData = await graphRes.json();
        if (!cancelled) setGraphData(data);
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

  return (
    <div className="relative h-full bg-[#fbfbfc]">
      <div className="flex h-full items-center justify-center p-8">
        {/* Visualization Frame */}
        <div className="relative h-full w-full rounded-2xl bg-neutral-100 overflow-hidden">

          {/* Status Overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-600">

            {loading ? (
              <StatusBlock title="Loading project..." />
            ) : jobStatus === "queued" || jobStatus === "running" ? (
              <div className="text-center">
                <div className="mb-2 text-lg font-medium">
                  {jobStatus === "queued" ? "Job queued..." : "Analyzing repository..."}
                </div>

                {progress !== null && progress !== undefined && (
                  <div className="mt-3 w-48 h-1.5 rounded-full bg-neutral-200 overflow-hidden">
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
            ) : graphData ? (
              <div className="text-center">
                <div className="mb-4 text-6xl">🏙️</div>
                <div className="text-lg font-medium text-neutral-900">3D Viewer Placeholder</div>
                <div className="mt-2 text-sm text-neutral-500">
                  Three.js will render here
                </div>
                <div className="mt-4 rounded-full bg-white px-4 py-2 text-xs text-neutral-600">
                  Loaded: {graphData.nodes.length} nodes · {graphData.edges.length} edges
                </div>
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
    </div>
  );
}

function StatusBlock({ title }: { title: string }) {
  return (
    <div className="text-center">
      <div className="text-lg font-medium text-neutral-900">{title}</div>
    </div>
  );
}
