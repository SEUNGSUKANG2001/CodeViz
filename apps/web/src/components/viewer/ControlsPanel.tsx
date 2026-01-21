"use client";

import type { ProjectDetailResponse } from "@/lib/types";
import type { ThemeType } from "./useCodeCityViewer";

const THEMES: ThemeType[] = ["Thema1", "Thema2", "Thema3"];

const THEME_INFO: Record<ThemeType, { icon: string; label: string }> = {
  Thema1: { icon: "I", label: "Thema1" },
  Thema2: { icon: "II", label: "Thema2" },
  Thema3: { icon: "III", label: "Thema3" },
  "2D": { icon: "", label: "" },
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
    usedBy: string[];
  } | null;
};

export function ControlsPanel({ project, theme, onThemeChange, saving, onSave, selectedNode }: Props) {
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
    <aside className="h-full overflow-y-auto border-l border-white/10 bg-black/40 p-6 backdrop-blur-md space-y-8">
      <div>
        <div className="text-[11px] tracking-[0.18em] text-white/45 mb-4">SCENE</div>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map((t) => (
            <button
              key={t}
              onClick={() => onThemeChange(t)}
              className={`rounded-none border border-white/10 px-3 py-3 text-center transition ${
                theme === t ? "bg-white/10 text-cyan-200" : "bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              <div className="text-[11px] tracking-[0.2em]">{THEME_INFO[t].icon}</div>
              <div className="mt-1 text-xs font-medium">{THEME_INFO[t].label}</div>
            </button>
          ))}
        </div>

        {onSave && (
          <button
            onClick={onSave}
            disabled={saving || !project}
            className="mt-4 w-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/80 hover:bg-white/10 disabled:text-white/40"
          >
            {saving ? "Saving..." : "Apply Theme"}
          </button>
        )}
      </div>

      {selectedNode && (
        <div>
          <div className="text-[11px] tracking-[0.18em] text-white/45 mb-4">SELECTION</div>
          <div className="rounded-none border border-white/10 bg-white/5 px-3 py-3 text-xs text-white/80 space-y-2">
            <div className="text-white/90 font-medium break-all">{selectedNode.id}</div>
            <div className="text-white/60">Lines: {selectedNode.lineCount.toLocaleString()}</div>
            <div>
              <div className="text-[10px] text-white/50 uppercase">Imports</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {selectedNode.imports.length ? selectedNode.imports.slice(0, 6).map((imp) => (
                  <span key={imp} className="rounded-none border border-white/10 bg-white/10 px-2 py-1 text-[10px] text-white/70">
                    {imp.split(/[\\/]/).pop()}
                  </span>
                )) : <span className="text-[10px] text-white/40">None</span>}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-white/50 uppercase">Used By</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {selectedNode.usedBy.length ? selectedNode.usedBy.slice(0, 6).map((imp) => (
                  <span key={imp} className="rounded-none border border-white/10 bg-white/10 px-2 py-1 text-[10px] text-white/70">
                    {imp.split(/[\\/]/).pop()}
                  </span>
                )) : <span className="text-[10px] text-white/40">None</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {statEntries.length > 0 && (
        <div>
          <div className="text-[11px] tracking-[0.18em] text-white/45 mb-4">STATISTICS</div>
          <div className="grid grid-cols-2 gap-2">
            {statEntries.map(({ key, value }) => (
              <div key={key} className="rounded-none border border-white/10 bg-white/5 px-3 py-2">
                <div className="text-[10px] text-white/50 uppercase">{formatLabel(key)}</div>
                <div className="mt-0.5 text-lg font-semibold text-white">
                  {formatValue(value)}
                </div>
              </div>
            ))}
          </div>

          {languageEntries.length > 0 && (
            <div className="mt-4">
              <div className="text-[10px] text-white/50 uppercase mb-2">Languages</div>
              <div className="flex flex-wrap gap-1">
                {languageEntries.map(([lang, count]) => (
                  <span
                    key={lang}
                    className="rounded-none border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/70"
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
        <div className="text-[11px] tracking-[0.18em] text-white/45 mb-4">PROJECT</div>
        <div className="space-y-3 text-sm text-white/75">
          {project?.repoUrl && (
            <div>
              <div className="text-[10px] text-white/50 uppercase">Repository</div>
              <a
                href={project.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-cyan-200 hover:underline"
              >
                {project.repoUrl}
              </a>
            </div>
          )}

          {project?.ref && (
            <div>
              <div className="text-[10px] text-white/50 uppercase">Branch / Ref</div>
              <div className="text-white/80">{project.ref}</div>
            </div>
          )}
        </div>
      </div>

    </aside>
  );
}
