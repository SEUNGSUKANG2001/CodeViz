import Link from "next/link";
import type { PostCard as PostCardT } from "@/lib/types";

export function PostCard({ item }: { item: PostCardT }) {
  return (
    <div className="group block">
      <div className="overflow-hidden rounded-2xl bg-neutral-100">
        <div className="aspect-[4/3] w-full">
          {item.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.coverUrl}
              alt={item.title}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div
              className="h-full w-full transition duration-500 group-hover:scale-[1.03]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 35% 40%, rgba(79,70,229,0.16), transparent 50%), radial-gradient(circle at 70% 65%, rgba(0,0,0,0.10), transparent 52%), linear-gradient(135deg, rgba(255,255,255,0.86), rgba(255,255,255,0))",
              }}
            />
          )}
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
