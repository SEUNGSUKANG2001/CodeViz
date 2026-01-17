"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { ProjectDetailResponse } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    <div className="h-[100dvh] w-full">
      <div className="flex h-14 items-center justify-between glass border-b border-white/10 px-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="font-semibold">
            CODEVIZ
          </Link>
          <span className="text-muted-foreground">/</span>
          <div className="font-medium">{data?.title ?? "Loading..."}</div>
          {data && (
            <>
              <Badge variant="secondary">{data.status}</Badge>
              {jobStatus && (
                <Badge variant={isJobDone ? "default" : "outline"}>
                  Job: {jobStatus}
                </Badge>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" asChild>
            <Link href="/me">My Page</Link>
          </Button>
          <Button
            size="sm"
            onClick={() => setPublishOpen(true)}
            disabled={!data || !isJobDone}
          >
            Publish
          </Button>
        </div>
      </div>

      <div className="grid h-[calc(100dvh-56px)] grid-cols-1 lg:grid-cols-[1fr_360px]">
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
