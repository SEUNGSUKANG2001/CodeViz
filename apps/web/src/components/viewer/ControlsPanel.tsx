"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import type { ProjectDetailResponse } from "@/lib/types";

const THEMES = ["city", "space", "forest"] as const;

const THEME_ICONS: Record<string, string> = {
  city: "🏙️",
  space: "🌌",
  forest: "🌲",
};

type Props = {
  project: ProjectDetailResponse["data"]["project"] | null;
};

export function ControlsPanel({ project }: Props) {
  const [theme, setTheme] = useState<string>(
    (project?.currentConfig?.theme as string) ?? "city"
  );
  const [saving, setSaving] = useState(false);

  async function saveConfig() {
    if (!project) return;
    setSaving(true);
    try {
      await apiFetch(`/api/v1/projects/${project.id}`, {
        method: "PATCH",
        json: {
          currentConfig: {
            ...project.currentConfig,
            theme,
          },
        },
      });
    } catch (e: unknown) {
      const error = e as Error;
      alert(error?.message ?? "Failed to save config");
    } finally {
      setSaving(false);
    }
  }

  const stats = project?.latestJob?.result?.stats as Record<string, number> | undefined;

  return (
    <aside className="overflow-y-auto border-l border-neutral-100 bg-white p-6 space-y-8">

      {/* Scene */}
      <div>
        <div className="text-[11px] tracking-[0.18em] text-neutral-400 mb-4">SCENE</div>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`rounded-xl p-3 text-center transition ${
                theme === t
                  ? "bg-indigo-50 ring-2 ring-indigo-500"
                  : "bg-neutral-50 hover:bg-neutral-100"
              }`}
            >
              <div className="text-xl">{THEME_ICONS[t]}</div>
              <div
                className={`mt-1 text-xs font-medium ${
                  theme === t ? "text-indigo-600" : "text-neutral-600"
                }`}
              >
                {t}
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={saveConfig}
          disabled={saving || !project}
          className="mt-4 w-full rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:bg-neutral-200 disabled:text-neutral-500"
        >
          {saving ? "Saving..." : "Apply Theme"}
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div>
          <div className="text-[11px] tracking-[0.18em] text-neutral-400 mb-4">STATISTICS</div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(stats).map(([key, value]) => (
              <div key={key} className="rounded-xl bg-neutral-50 px-3 py-2">
                <div className="text-[10px] text-neutral-500 uppercase">{key}</div>
                <div className="mt-0.5 text-lg font-semibold text-neutral-900">
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Project */}
      <div>
        <div className="text-[11px] tracking-[0.18em] text-neutral-400 mb-4">PROJECT</div>
        <div className="space-y-3 text-sm">
          {project?.repoUrl && (
            <div>
              <div className="text-[10px] text-neutral-500 uppercase">Repository</div>
              <a
                href={project.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-indigo-600 hover:underline"
              >
                {project.repoUrl}
              </a>
            </div>
          )}

          {project?.ref && (
            <div>
              <div className="text-[10px] text-neutral-500 uppercase">Branch / Ref</div>
              <div className="text-neutral-800">{project.ref}</div>
            </div>
          )}
        </div>
      </div>

      {/* Placeholder */}
      <div className="rounded-xl bg-neutral-50 px-4 py-3 text-xs text-neutral-400">
        Camera controls and filters will be added here.
      </div>
    </aside>
  );
}
