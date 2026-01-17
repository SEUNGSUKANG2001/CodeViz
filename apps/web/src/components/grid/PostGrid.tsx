"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { FeedResponse, PostCard as PostCardT } from "@/lib/types";
import { PostCard } from "@/components/cards/PostCard";

export function PostGrid() {
  const [items, setItems] = useState<PostCardT[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch<FeedResponse>("/api/v1/feed?limit=24");
        setItems(res.data.items);
      } catch {
        // Feed might be empty or error
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="text-sm text-muted-foreground">Loading...</div>;

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        No posts yet. Be the first to share your code visualization!
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((it) => (
        <Link key={it.postId} href={`/post/${it.postId}`}>
          <PostCard item={it} />
        </Link>
      ))}
    </div>
  );
}
