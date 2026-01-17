"use client";

import { Dispatch, SetStateAction } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { PostDetail, ToggleLikeResponse, ToggleFollowResponse } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

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
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <Link href={`/u/${post.author.id}`} className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={post.author.avatarUrl ?? undefined} />
              <AvatarFallback>{post.author.displayName?.[0] ?? "U"}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium leading-tight">
                {post.author.displayName ?? "User"}
              </div>
              <div className="text-xs text-muted-foreground">
                @{post.author.username ?? "user"}
              </div>
            </div>
          </Link>

          <Separator className="my-4" />

          <div className="flex flex-col gap-2">
            <Button onClick={onFollow} variant="secondary">
              + Follow
            </Button>
            <Button onClick={onShare} variant="secondary">
              Share Link
            </Button>
            <Button onClick={onToggleLike}>
              👍 Like · {post.counts.likes}
            </Button>
          </div>
        </CardContent>
      </Card>

      {post.snapshot.job && (
        <Card>
          <CardContent className="p-4">
            <div className="mb-2 text-sm font-medium">Analysis</div>
            <div className="text-xs text-muted-foreground">
              Status: {post.snapshot.job.status}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="rounded-xl border bg-background p-3 text-sm text-muted-foreground">
        Tip: The sidebar stays fixed while content scrolls.
      </div>
    </div>
  );
}
