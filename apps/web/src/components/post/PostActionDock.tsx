"use client";

import Link from "next/link";
import { Heart, Share2, User } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { PostDetail, ToggleFollowResponse, ToggleLikeResponse } from "@/lib/types";

type Props = {
  post: PostDetail;
  onPostUpdate: (post: PostDetail) => void;
};

export function PostActionDock({ post, onPostUpdate }: Props) {
  async function onToggleLike() {
    try {
      const res = await apiFetch<ToggleLikeResponse>(`/api/v1/posts/${post.id}/like`, {
        method: "POST",
      });
      onPostUpdate({ ...post, counts: { ...post.counts, likes: res.data.likeCount } });
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

  const avatarContent = post.author.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={post.author.avatarUrl} alt="" className="h-full w-full object-cover" />
  ) : (
    <div className="flex h-full w-full items-center justify-center text-sm font-medium text-neutral-600">
      {post.author.displayName?.[0] ?? "U"}
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-3">
      <Link
        href={`/u/${post.author.id}`}
        className="h-12 w-12 overflow-hidden rounded-full border border-white/40 bg-white shadow-lg"
      >
        {avatarContent}
      </Link>

      <button
        onClick={onFollow}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shadow-lg"
        aria-label="Follow user"
      >
        <User className="h-5 w-5" />
      </button>

      <button
        onClick={onToggleLike}
        className="relative flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-700 shadow-lg"
        aria-label="Like post"
      >
        <Heart className="h-5 w-5" />
        <span className="absolute -right-1 -top-1 rounded-full bg-neutral-900 px-1.5 py-0.5 text-[10px] text-white">
          {post.counts.likes}
        </span>
      </button>

      <button
        onClick={onShare}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-sky-700 shadow-lg"
        aria-label="Share post"
      >
        <Share2 className="h-5 w-5" />
      </button>
    </div>
  );
}
