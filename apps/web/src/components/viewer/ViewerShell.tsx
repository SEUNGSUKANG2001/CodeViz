"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { ProjectDetailResponse } from "@/lib/types";
import { ThreeViewer } from "@/components/viewer/ThreeViewer";
import { ControlsPanel } from "@/components/viewer/ControlsPanel";
import { PublishDialog } from "@/components/modals/PublishDialog";

const POLL_INTERVAL = 2000; // 2 seconds

export function ViewerShell({ projectId }: { projectId: string }) {
  const [data, setData] = useState<ProjectDetailResponse["data"]["project"] | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProject = useCallback(async () => {
    try {
      const res = await apiFetch<ProjectDetailResponse>(`/api/v1/projects/${projectId}`);
      setData(res.data.project);
      return res.data.project;
    } catch (e: unknown) {
      const error = e as Error;
      console.error(error?.message ?? "Failed to load project");
      return null;
    }
  }, [projectId]);

  // Initial fetch
  useEffect(() => {
    (async () => {
      await fetchProject();
      setLoading(false);
    })();
  }, [fetchProject]);

  // Poll while job is in progress
  useEffect(() => {
    const jobStatus = data?.latestJob?.status;
    const shouldPoll = jobStatus === "queued" || jobStatus === "running";

    if (!shouldPoll) return;

    const intervalId = setInterval(async () => {
      const updated = await fetchProject();
      const newStatus = updated?.latestJob?.status;
      // Stop polling if job is no longer in progress
      if (newStatus !== "queued" && newStatus !== "running") {
        clearInterval(intervalId);
      }
    }, POLL_INTERVAL);

    return () => clearInterval(intervalId);
  }, [data?.latestJob?.status, fetchProject]);

  const jobStatus = data?.latestJob?.status;
  const isJobDone = jobStatus === "done";

  return (
    <div className="h-[100dvh] w-full bg-[#fbfbfc]">
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-neutral-200 px-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative h-8 w-8 rounded-2xl border border-neutral-300 bg-white">
              <div className="absolute left-2 top-2 h-1.5 w-1.5 rounded-full bg-indigo-600" />
            </div>
            <span className="text-sm font-semibold tracking-[0.18em] text-neutral-900">CODEVIZ</span>
          </Link>
          <span className="text-neutral-300">/</span>
          <div className="font-medium text-neutral-700">{data?.title ?? "Loading..."}</div>
          {data && (
            <>
              <span className="rounded-full border border-neutral-300 bg-white px-2 py-0.5 text-xs text-neutral-600">
                {data.status}
              </span>
              {jobStatus && (
                <span className={`rounded-full px-2 py-0.5 text-xs ${
                  isJobDone
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                    : "border border-neutral-300 bg-white text-neutral-600"
                }`}>
                  Job: {jobStatus}
                </span>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/me"
            className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm hover:bg-neutral-50"
          >
            My Page
          </Link>
          <button
            onClick={() => setPublishOpen(true)}
            disabled={!data || !isJobDone}
            className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:bg-neutral-200 disabled:text-neutral-500"
          >
            Publish
          </button>
        </div>
      </div>

      <div className="grid h-[calc(100dvh-64px)] grid-cols-1 lg:grid-cols-[1fr_380px]">
        <ThreeViewer project={data} loading={loading} />
        <ControlsPanel project={data} />
      </div>

      {data && (
        <PublishDialog
          open={publishOpen}
          onOpenChange={setPublishOpen}
          projectId={projectId}
          repoUrl={data.repoUrl}
          currentConfig={data.currentConfig ?? {}}
          latestJobId={data.latestJob?.id ?? null}
        />
      )}
    </div>
  );
}
