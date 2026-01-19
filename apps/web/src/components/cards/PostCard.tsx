import dynamic from "next/dynamic";
import type { PostCard as PostCardT } from "@/lib/types";

const GraphThumbnail = dynamic(
  () => import("@/components/viewer/GraphThumbnail").then((m) => m.GraphThumbnail),
  { ssr: false }
);

export function PostCard({ item }: { item: PostCardT }) {
  const theme = (item.theme as "Thema1" | "Thema2" | "Thema3") || "Thema1";
  return (
    <div className="group block">
      <div className="overflow-hidden rounded-none bg-neutral-100">
        <div className="relative aspect-[4/3] w-full">
          <GraphThumbnail
            jobId={item.jobId ?? null}
            jobStatus={item.jobStatus ?? null}
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
          <div className="shrink-0 text-xs text-neutral-500">{item.likeCount}</div>
        </div>

        <div className="mt-2 flex items-center justify-between text-xs text-neutral-500">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-full bg-neutral-100 overflow-hidden">
              {item.author.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.author.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[9px] font-medium text-neutral-400">
                  {item.author.displayName?.[0] ?? "U"}
                </div>
              )}
            </div>
            <span className="truncate">@{item.author.username ?? "user"}</span>
          </div>
          <span className="inline-flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-neutral-300" />
            {item.commentCount} comments
          </span>
        </div>
      </div>
    </div>
  );
}
