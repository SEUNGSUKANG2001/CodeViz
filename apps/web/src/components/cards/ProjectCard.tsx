import Link from "next/link";
import dynamic from "next/dynamic";
import type { ProjectCard as ProjectCardT } from "@/lib/types";

const GraphThumbnail = dynamic(
  () => import("@/components/viewer/GraphThumbnail").then((m) => m.GraphThumbnail),
  { ssr: false }
);

interface ProjectCardProps {
  project: ProjectCardT;
  onDelete: (projectId: string, e: React.MouseEvent) => void;
}

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const theme = (project.currentConfig?.theme as "Thema1" | "Thema2" | "Thema3") || "Thema1";

  return (
    <div className="group relative">
      <Link
        href={`/p/${project.id}`}
        className="block overflow-hidden rounded-3xl border border-white/5 bg-[#121212] transition-all hover:border-white/20 hover:shadow-2xl hover:shadow-indigo-500/10 active:scale-[0.98]"
      >
        <div className="relative aspect-[16/10] w-full overflow-hidden">
          <GraphThumbnail
            jobId={project.latestJob?.id ?? null}
            jobStatus={project.latestJob?.status ?? null}
            coverUrl={project.coverUrl}
            title={project.title}
            theme={theme}
            className="absolute inset-0"
          />

          <div className="absolute inset-x-4 top-4 flex justify-end">
            <span
              className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ring-1 ${project.status === "ready"
                  ? "bg-emerald-500/20 text-emerald-400 ring-emerald-500/30"
                  : "bg-amber-500/20 text-amber-400 ring-amber-500/30"
                }`}
            >
              {project.status}
            </span>
          </div>
        </div>

        <div className="p-5">
          <h3 className="line-clamp-1 text-base font-semibold text-white group-hover:text-indigo-400 transition-colors">
            {project.title || "Untitled Project"}
          </h3>
          <div className="mt-2 flex items-center gap-2 overflow-hidden text-neutral-500">
            <svg className="h-3.5 w-3.5 shrink-0 opacity-50" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            <span className="truncate text-xs font-medium opacity-60">
              {project.repoUrl.replace("https://github.com/", "")}
            </span>
          </div>
        </div>
      </Link>

      {/* Outer Delete Button */}
      <button
        onClick={(e) => onDelete(project.id, e)}
        className="absolute left-4 top-4 z-20 rounded-full bg-black/40 p-2 text-neutral-400 backdrop-blur-md transition-all hover:bg-red-500/20 hover:text-red-400 hover:ring-1 hover:ring-red-500/30 active:scale-95 opacity-0 group-hover:opacity-100"
        title="Delete Project"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>
    </div>
  );
}
