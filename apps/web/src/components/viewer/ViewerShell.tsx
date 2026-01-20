"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { ProjectDetailResponse } from "@/lib/types";
import { ThreeViewer } from "@/components/viewer/ThreeViewer";
import { ControlsPanel } from "@/components/viewer/ControlsPanel";
import { PublishDialog } from "@/components/modals/PublishDialog";
import type { ThemeType } from "./useCodeCityViewer";

const POLL_INTERVAL = 2000; // 2 seconds

export function ViewerShell({ projectId }: { projectId: string }) {
  const [data, setData] = useState<ProjectDetailResponse["data"]["project"] | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<ThemeType>("Thema1");
  const [saving, setSaving] = useState(false);

  const fetchProject = useCallback(async () => {
    try {
      const res = await apiFetch<ProjectDetailResponse>(`/api/v1/projects/${projectId}`);
      setData(res.data.project);
      // Set theme from project config if available
      const configTheme = res.data.project?.currentConfig?.theme as ThemeType | undefined;
      if (configTheme && ["Thema1", "Thema2", "Thema3"].includes(configTheme)) {
        setTheme(configTheme);
      }
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

  // Save theme to project config
  const saveConfig = async () => {
    if (!data) return;
    setSaving(true);
    try {
      await apiFetch(`/api/v1/projects/${data.id}`, {
        method: "PATCH",
        json: {
          currentConfig: {
            ...data.currentConfig,
            theme,
          },
        },
      });
      // Refresh project data
      await fetchProject();
    } catch (e: unknown) {
      const error = e as Error;
      alert(error?.message ?? "Failed to save config");
    } finally {
      setSaving(false);
    }
  };

  const jobStatus = data?.latestJob?.status;
  const isJobDone = jobStatus === "done";

  return (
    <div className="h-[100dvh] w-full bg-[#050505]">
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-white/10 bg-black/40 px-6 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative h-8 w-8 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md">
              <div className="absolute left-2 top-2 h-1.5 w-1.5 rounded-full bg-indigo-500" />
            </div>
            <span className="text-sm font-semibold tracking-[0.18em] text-white">CODEVIZ</span>
          </Link>
          <span className="text-neutral-700">/</span>
          <div className="font-medium text-white">{data?.title ?? "Loading..."}</div>
          {data && (
            <>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-neutral-400">
                {data.status}
              </span>
              {jobStatus && (
                <span className={`rounded-full px-2 py-0.5 text-xs border ${isJobDone
                  ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                  : "border-white/10 bg-white/5 text-neutral-400"
                  }`}>
                  Job: {jobStatus}
                </span>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/feed"
            className="rounded-full border border-white/10 bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            Explore
          </Link>
          <Link
            href="/me"
            className="rounded-full border border-white/10 bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            My Page
          </Link>
          <button
            onClick={() => setPublishOpen(true)}
            disabled={!data || !isJobDone}
            className="rounded-full bg-white px-4 py-2 text-sm font-bold text-black transition hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Publish
          </button>
        </div>
      </div>

      <div className="relative h-[calc(100dvh-64px)] w-full overflow-hidden">
        <ThreeViewer
          project={data}
          loading={loading}
          theme={theme}
          onThemeChange={setTheme}
        />
      </div>

      {data && (
        <PublishDialog
          open={publishOpen}
          onOpenChange={setPublishOpen}
          projectId={projectId}
          repoUrl={data.repoUrl}
          currentConfig={{ ...data.currentConfig, theme }}
          latestJobId={data.latestJob?.id ?? null}
        />
      )}
    </div>
  );
}