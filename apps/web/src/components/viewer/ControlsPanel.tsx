"use client";

import type { ProjectDetailResponse } from "@/lib/types";
import type { ThemeType } from "./useCodeCityViewer";

const THEMES: ThemeType[] = ["Thema1", "Thema2", "Thema3"];

const THEME_INFO: Record<ThemeType, { icon: string; label: string }> = {
  Thema1: { icon: "🏙️", label: "City" },
  Thema2: { icon: "🌌", label: "Space" },
  Thema3: { icon: "🌲", label: "Forest" },
};

type StatsData = {
  nodeCount?: number;
  edgeCount?: number;
  fileCount?: number;
  directoryCount?: number;
  totalLines?: number;
  languages?: Record<string, number>;
  commitCount?: number;
};

type Props = {
  project: ProjectDetailResponse["data"]["project"] | null;
  theme: ThemeType;
  onThemeChange: (theme: ThemeType) => void;
  saving?: boolean;
  onSave?: () => void;
  selectedNode?: {
    id: string;
    lineCount: number;
    imports: string[];
    importedBy: string[];
  } | null;
};

export function ControlsPanel({
  project,
  theme,
  onThemeChange,
  saving,
  onSave,
  selectedNode,
}: Props) {
  const stats = project?.latestJob?.result?.stats as StatsData | undefined;

  const formatLabel = (key: string) => {
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (s) => s.toUpperCase())
      .trim();
  };

  const formatValue = (value: number | undefined) => {
    if (typeof value === "number") {
      return value.toLocaleString();
    }
    return "-";
  };

  const statEntries: Array<{ key: string; value: number | undefined }> = stats
    ? [
        { key: "nodeCount", value: stats.nodeCount },
        { key: "edgeCount", value: stats.edgeCount },
        { key: "fileCount", value: stats.fileCount },
        { key: "directoryCount", value: stats.directoryCount },
        { key: "totalLines", value: stats.totalLines },
        { key: "commitCount", value: stats.commitCount },
      ].filter((e) => e.value !== undefined)
    : [];

  const languages = stats?.languages;
  const languageEntries = languages
    ? Object.entries(languages)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
    : [];

  return (
    <aside className="overflow-y-auto border-l border-neutral-100 bg-white p-6 space-y-8">
      {selectedNode && (
        <div>
          <div className="text-[11px] tracking-[0.18em] text-neutral-400 mb-4">SELECTION</div>
          <div className="rounded-xl bg-neutral-50 px-4 py-3">
            <div className="text-sm font-semibold text-neutral-800 break-all">
              {selectedNode.id.split("/").pop()}
            </div>
            <div className="mt-1 text-xs text-neutral-500 break-all">{selectedNode.id}</div>
            <div className="mt-3 text-xs text-neutral-500">
              Lines: <span className="text-neutral-700">{selectedNode.lineCount.toLocaleString()}</span>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-[10px] text-neutral-500 uppercase mb-2">Imports</div>
            <ul className="space-y-1 text-xs text-neutral-600">
              {selectedNode.imports.length === 0 ? (
                <li className="text-neutral-400">(None)</li>
              ) : (
                selectedNode.imports.slice(0, 8).map((item) => (
                  <li key={item} className="break-all">
                    {item.split("/").pop()}
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="mt-4">
            <div className="text-[10px] text-neutral-500 uppercase mb-2">Used By</div>
            <ul className="space-y-1 text-xs text-neutral-600">
              {selectedNode.importedBy.length === 0 ? (
                <li className="text-neutral-400">(None)</li>
              ) : (
                selectedNode.importedBy.slice(0, 8).map((item) => (
                  <li key={item} className="break-all">
                    {item.split("/").pop()}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}
      <div>
        <div className="text-[11px] tracking-[0.18em] text-neutral-400 mb-4">SCENE</div>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map((t) => (
            <button
              key={t}
              onClick={() => onThemeChange(t)}
              className={`rounded-xl p-3 text-center transition ${
                theme === t
                  ? "bg-indigo-50 ring-2 ring-indigo-500"
                  : "bg-neutral-50 hover:bg-neutral-100"
              }`}
            >
              <div className="text-xl">{THEME_INFO[t].icon}</div>
              <div
                className={`mt-1 text-xs font-medium ${
                  theme === t ? "text-indigo-600" : "text-neutral-600"
                }`}
              >
                {THEME_INFO[t].label}
              </div>
            </button>
          ))}
        </div>

        {onSave && (
          <button
            onClick={onSave}
            disabled={saving || !project}
            className="mt-4 w-full rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:bg-neutral-200 disabled:text-neutral-500"
          >
            {saving ? "Saving..." : "Apply Theme"}
          </button>
        )}
      </div>

      {statEntries.length > 0 && (
        <div>
          <div className="text-[11px] tracking-[0.18em] text-neutral-400 mb-4">STATISTICS</div>
          <div className="grid grid-cols-2 gap-2">
            {statEntries.map(({ key, value }) => (
              <div key={key} className="rounded-xl bg-neutral-50 px-3 py-2">
                <div className="text-[10px] text-neutral-500 uppercase">{formatLabel(key)}</div>
                <div className="mt-0.5 text-lg font-semibold text-neutral-900">
                  {formatValue(value)}
                </div>
              </div>
            ))}
          </div>

          {languageEntries.length > 0 && (
            <div className="mt-4">
              <div className="text-[10px] text-neutral-500 uppercase mb-2">Languages</div>
              <div className="flex flex-wrap gap-1">
                {languageEntries.map(([lang, count]) => (
                  <span
                    key={lang}
                    className="rounded-full bg-neutral-100 px-2 py-1 text-xs text-neutral-600"
                  >
                    {lang}: {count}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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

          {project?.latestJob?.status && (
            <div>
              <div className="text-[10px] text-neutral-500 uppercase">Status</div>
              <div className={`inline-flex items-center gap-1.5 ${
                project.latestJob.status === "done" ? "text-green-600" :
                project.latestJob.status === "running" ? "text-indigo-600" :
                project.latestJob.status === "failed" ? "text-red-600" :
                "text-neutral-600"
              }`}>
                <span className={`h-2 w-2 rounded-full ${
                  project.latestJob.status === "done" ? "bg-green-500" :
                  project.latestJob.status === "running" ? "bg-indigo-500 animate-pulse" :
                  project.latestJob.status === "failed" ? "bg-red-500" :
                  "bg-neutral-400"
                }`} />
                {project.latestJob.status.charAt(0).toUpperCase() + project.latestJob.status.slice(1)}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl bg-neutral-50 px-4 py-3 text-xs text-neutral-500 space-y-1">
        <div className="font-medium text-neutral-700">Controls</div>
        <div>Drag to rotate</div>
        <div>Scroll to zoom</div>
        <div>Click node for details</div>
      </div>
    </aside>
  );
}
