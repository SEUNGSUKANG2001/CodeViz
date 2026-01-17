"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { ListUserPostsResponse, PostCard as PostCardT } from "@/lib/types";
import { PostCard } from "@/components/cards/PostCard";

type Props = {
  userId: string;
};

export function PostGridFromUser({ userId }: Props) {
  const [items, setItems] = useState<PostCardT[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch<ListUserPostsResponse>(
          `/api/v1/users/${userId}/posts?limit=24`
        );
        setItems(res.data.items);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  if (loading) {
    return <div className="text-sm text-neutral-500">Loading...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500">
        No public posts yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((it) => (
        <Link key={it.postId} href={`/post/${it.postId}`}>
          <PostCard item={it} />
        </Link>
      ))}
    </div>
  );
}
