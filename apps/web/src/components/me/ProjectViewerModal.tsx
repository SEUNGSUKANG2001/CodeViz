"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { ProjectDetailResponse } from "@/lib/types";
import type { ThemeType } from "@/components/viewer/useCodeCityViewer";
import { PostVisualization } from "@/components/post/PostVisualization";

type Props = {
  projectId: string;
  onClose: () => void;
};

export function ProjectViewerModal({ projectId, onClose }: Props) {
  const [project, setProject] = useState<ProjectDetailResponse["data"]["project"] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await apiFetch<ProjectDetailResponse>(`/api/v1/projects/${projectId}`);
        if (!cancelled) setProject(res.data.project);
      } catch {
        if (!cancelled) setProject(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const theme = (project?.currentConfig?.theme as ThemeType) || "Thema1";

  return (
    <div className="fixed inset-0 z-50">
      {!loading && project ? (
        <PostVisualization
          jobId={project.latestJob?.id ?? null}
          jobStatus={project.latestJob?.status ?? null}
          coverUrl={project.coverUrl ?? null}
          title={project.title}
          theme={theme}
          planet={project.planet ?? null}
          immersive
          onClose={onClose}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="text-sm text-white/60">Loading viewer...</div>
        </div>
      )}
    </div>
  );
}
