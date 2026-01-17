"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import type { Comment, ListCommentsResponse, CreateCommentResponse } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

type Props = {
  postId: string;
  initialCount?: number;
};

export function Comments({ postId, initialCount }: Props) {
  const [items, setItems] = useState<Comment[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);

  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  const load = useCallback(async (nextCursor: string | null = null) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("limit", "50");
      if (nextCursor) qs.set("cursor", nextCursor);

      const res = await apiFetch<ListCommentsResponse>(
        `/api/v1/posts/${postId}/comments?${qs.toString()}`
      );
      setItems((prev) => (nextCursor ? [...prev, ...res.data.items] : res.data.items));
      setCursor(res.data.nextCursor);
      setHasMore(!!res.data.nextCursor);
    } catch {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit() {
    if (!body.trim()) return;
    setPosting(true);
    try {
      const res = await apiFetch<CreateCommentResponse>(
        `/api/v1/posts/${postId}/comments`,
        {
          method: "POST",
          json: { body, parentId: null },
        }
      );
      setItems((prev) => [res.data.comment, ...prev]);
      setBody("");
    } catch (e: unknown) {
      const error = e as Error;
      alert(error?.message ?? "Comment failed (login required?)");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <h3 className="text-lg font-semibold">Comments</h3>
        <span className="text-sm text-muted-foreground">
          {initialCount ?? items.length}
        </span>
      </div>

      <div className="rounded-xl border p-3">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a comment..."
          className="min-h-[90px]"
        />
        <div className="mt-3 flex justify-end">
          <Button onClick={submit} disabled={posting || !body.trim()}>
            {posting ? "Posting..." : "Post"}
          </Button>
        </div>
      </div>

      <Separator />

      {loading && items.length === 0 ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-muted-foreground">No comments yet.</div>
      ) : (
        <div className="space-y-4">
          {items.map((c) => (
            <div key={c.id} className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={c.author.avatarUrl ?? undefined} />
                <AvatarFallback>{c.author.displayName?.[0] ?? "U"}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">
                    {c.author.displayName ?? "User"}
                  </span>
                  <span className="text-muted-foreground">
                    @{c.author.username ?? "user"}
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="mt-1 whitespace-pre-wrap text-sm">
                  {c.isDeleted ? (
                    <span className="text-muted-foreground">(deleted)</span>
                  ) : (
                    c.body
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="pt-2">
          <Button
            variant="secondary"
            onClick={() => load(cursor)}
            disabled={loading}
          >
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
