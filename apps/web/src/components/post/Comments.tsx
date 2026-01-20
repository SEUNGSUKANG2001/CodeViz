"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import type { Comment, ListCommentsResponse, CreateCommentResponse } from "@/lib/types";

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
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <h3 className="text-xl font-bold text-white">Comments</h3>
        <span className="text-sm font-medium text-neutral-500">
          {initialCount ?? items.length}
        </span>
      </div>

      {/* Write comment */}
      <div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a comment..."
          className="w-full min-h-[100px] rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-neutral-500 focus:ring-2 focus:ring-indigo-500/50 transition-all resize-none"
        />
        <div className="mt-3 flex justify-end">
          <button
            onClick={submit}
            disabled={posting || !body.trim()}
            className="rounded-full bg-white px-6 py-2 text-sm font-bold text-black hover:bg-neutral-200 disabled:opacity-50 transition-all active:scale-95"
          >
            {posting ? "Posting..." : "Post"}
          </button>
        </div>
      </div>

      {/* Comments list */}
      {loading && items.length === 0 ? (
        <div className="text-sm text-neutral-500">Loading...</div>
      ) : items.length === 0 ? (
        <div className="py-8 text-center text-sm text-neutral-400">No comments yet.</div>
      ) : (
        <div className="space-y-8">
          {items.map((c) => (
            <div key={c.id} className="flex gap-4">
              <div className="h-10 w-10 border border-white/10 rounded-full bg-white/5 overflow-hidden flex-shrink-0">
                {c.author.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.author.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-medium text-neutral-500">
                    {c.author.displayName?.[0] ?? "U"}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold text-white">
                    {c.author.displayName ?? "User"}
                  </span>
                  <span className="text-neutral-500">
                    @{c.author.username ?? "user"}
                  </span>
                  <span className="h-1 w-1 rounded-full bg-neutral-800" />
                  <span className="text-neutral-500">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="mt-1.5 whitespace-pre-wrap text-sm text-neutral-300 leading-relaxed">
                  {c.isDeleted ? (
                    <span className="text-neutral-400">(deleted)</span>
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
        <div className="pt-4">
          <button
            onClick={() => load(cursor)}
            disabled={loading}
            className="rounded-full border border-white/10 bg-white/5 px-6 py-2 text-sm font-medium text-neutral-300 hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
