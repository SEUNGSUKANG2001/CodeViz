import type { ProjectCard as ProjectCardT } from "@/lib/types";
import dynamic from "next/dynamic";

const GraphThumbnail = dynamic(
  () => import("@/components/viewer/GraphThumbnail").then((m) => m.GraphThumbnail),
  { ssr: false }
);

type Props = {
  item: ProjectCardT;
};

export function ProjectCard({ item }: Props) {
  const theme = (item.currentConfig?.theme as "Thema1" | "Thema2" | "Thema3") || "Thema1";
  const statusStyles = {
    ready: "bg-indigo-50 text-indigo-700 border-indigo-200",
    error: "bg-red-50 text-red-700 border-red-200",
    draft: "bg-neutral-100 text-neutral-600 border-neutral-200",
  };

  return (
    <div className="group block">
      <div className="overflow-hidden rounded-none bg-neutral-100">
        <div className="relative aspect-[4/3] w-full">
          <GraphThumbnail
            jobId={item.latestJob?.id ?? null}
            jobStatus={item.latestJob?.status ?? null}
            coverUrl={item.coverUrl}
            title={item.title}
            theme={theme}
            className="absolute inset-0"
          />
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-neutral-900">
            {item.title}
          </h3>
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${
              statusStyles[item.status as keyof typeof statusStyles] ?? statusStyles.draft
            }`}
          >
            {item.status}
          </span>
        </div>

        <div className="mt-2 text-xs text-neutral-500">
          {new Date(item.updatedAt).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
