"use client";

import { useEffect, useRef, useState } from "react";
import type { GraphData, ResultUrlResponse } from "@/lib/types";
import { apiFetch } from "@/lib/api";
import { useCodeCityViewer, type ThemeType } from "@/components/viewer/useCodeCityViewer";

type Props = {
  jobId?: string | null;
  jobStatus?: string | null;
  coverUrl?: string | null;
  title: string;
  theme?: ThemeType;
};

export function PostVisualization({ jobId, jobStatus, coverUrl, title, theme = "Thema1" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [graphLoading, setGraphLoading] = useState(false);
  const [graphError, setGraphError] = useState<string | null>(null);
  const [viewerReady, setViewerReady] = useState(false);

  useCodeCityViewer(containerRef, viewerReady ? graphData : null, { theme });

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
  }, [jobId, jobStatus]);

  if (!jobId || jobStatus !== "done" || graphError) {
    return (
      <div className="aspect-[16/9] w-full overflow-hidden rounded-none bg-neutral-100">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div
            className="h-full w-full"
            style={{
              backgroundImage:
                "radial-gradient(circle at 35% 40%, rgba(79,70,229,0.16), transparent 50%), radial-gradient(circle at 70% 65%, rgba(0,0,0,0.10), transparent 52%), linear-gradient(135deg, rgba(255,255,255,0.86), rgba(255,255,255,0))",
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-none bg-[#87CEEB]">
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ visibility: viewerReady && graphData ? "visible" : "hidden" }}
      />
      {(graphLoading || !viewerReady) && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-neutral-600">
          Loading visualization...
        </div>
      )}
    </div>
  );
}
