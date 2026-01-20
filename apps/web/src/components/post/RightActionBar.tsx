"use client";

import { Dispatch, SetStateAction } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { PostDetail, ToggleLikeResponse, ToggleFollowResponse } from "@/lib/types";

type Props = {
  post: PostDetail;
  onPostUpdate: Dispatch<SetStateAction<PostDetail | null>>;
};

export function RightActionBar({ post, onPostUpdate }: Props) {
  async function onToggleLike() {
    try {
      const res = await apiFetch<ToggleLikeResponse>(`/api/v1/posts/${post.id}/like`, {
        method: "POST",
      });
      onPostUpdate((prev) =>
        prev
          ? {
            ...prev,
            counts: { ...prev.counts, likes: res.data.likeCount },
          }
          : null
      );
    } catch (e: unknown) {
      const error = e as Error;
      alert(error?.message ?? "Like failed (login required?)");
    }
  }

  async function onFollow() {
    try {
      const res = await apiFetch<ToggleFollowResponse>(
        `/api/v1/users/${post.author.id}/follow`,
        { method: "POST" }
      );
      alert(res.data.following ? "Followed!" : "Unfollowed");
    } catch (e: unknown) {
      const error = e as Error;
      alert(error?.message ?? "Follow failed (login required?)");
    }
  }

  function onShare() {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    alert("Link copied!");
  }

  return (
    <div className="space-y-6">
      {/* Author */}
      <div>
        <Link href={`/u/${post.author.id}`} className="flex items-center gap-3">
          <div className="h-11 w-11 border border-white/10 rounded-full bg-white/5 overflow-hidden">
            {post.author.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.author.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-medium text-neutral-500">
                {post.author.displayName?.[0] ?? "U"}
              </div>
            )}
          </div>
          <div>
            <div className="font-semibold leading-tight text-white">
              {post.author.displayName ?? "User"}
            </div>
            <div className="text-xs text-neutral-500">
              @{post.author.username ?? "user"}
            </div>
          </div>
        </Link>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <button
          onClick={onToggleLike}
          className="rounded-full bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition-all active:scale-95"
        >
          Like · {post.counts.likes}
        </button>
        <button
          onClick={onFollow}
          className="rounded-full bg-white px-4 py-2.5 text-sm font-bold text-black hover:bg-neutral-200 transition-all active:scale-95"
        >
          Follow Author
        </button>
        <button
          onClick={onShare}
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-neutral-300 hover:bg-white/10 transition-all active:scale-95"
        >
          Share Link
        </button>
      </div>

      {/* Stats */}
      {post.snapshot.job && (
        <div className="pt-4 border-t border-white/5">
          <div className="text-[11px] font-medium tracking-[0.2em] text-neutral-500 uppercase">ANALYSIS</div>
          <div className="mt-2 text-sm text-neutral-400">
            Status: <span className="font-semibold text-white">{post.snapshot.job.status}</span>
          </div>
        </div>
      )}
    </div>
  );
}
