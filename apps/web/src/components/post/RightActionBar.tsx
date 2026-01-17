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
          <div className="h-11 w-11 rounded-full bg-neutral-100 overflow-hidden">
            {post.author.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.author.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-medium text-neutral-400">
                {post.author.displayName?.[0] ?? "U"}
              </div>
            )}
          </div>
          <div>
            <div className="font-medium leading-tight text-neutral-900">
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
          className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Like · {post.counts.likes}
        </button>
        <button
          onClick={onFollow}
          className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Follow
        </button>
        <button
          onClick={onShare}
          className="rounded-full bg-neutral-100 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-200"
        >
          Share Link
        </button>
      </div>

      {/* Stats */}
      {post.snapshot.job && (
        <div className="pt-4">
          <div className="text-[11px] tracking-[0.18em] text-neutral-400">ANALYSIS</div>
          <div className="mt-2 text-sm text-neutral-600">
            Status: <span className="font-medium text-neutral-900">{post.snapshot.job.status}</span>
          </div>
        </div>
      )}
    </div>
  );
}
