"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { PostDetail, PostDetailResponse } from "@/lib/types";
import { TopNav } from "@/components/nav/TopNav";
import { RightActionBar } from "@/components/post/RightActionBar";
import { Comments } from "@/components/post/Comments";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export function PostDetailPageClient({ postId }: { postId: string }) {
  const [post, setPost] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const authorHref = useMemo(() => (post ? `/u/${post.author.id}` : "#"), [post]);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch<PostDetailResponse>(`/api/v1/posts/${postId}`);
        setPost(res.data.post);
      } catch (e: unknown) {
        const error = e as Error;
        console.error(error?.message ?? "Failed to load post");
      } finally {
        setLoading(false);
      }
    })();
  }, [postId]);

  return (
    <main className="min-h-screen">
      <TopNav />
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-8 lg:grid-cols-[1fr_320px]">
        <section>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : post ? (
            <>
              <header className="space-y-3">
                <h1 className="text-3xl font-semibold tracking-tight">{post.title}</h1>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <Link href={authorHref} className="flex items-center gap-2 hover:underline">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={post.author.avatarUrl ?? undefined} />
                      <AvatarFallback>{post.author.displayName?.[0] ?? "U"}</AvatarFallback>
                    </Avatar>
                    <span>{post.author.displayName ?? "User"}</span>
                  </Link>
                  <span>·</span>
                  <span>{new Date(post.createdAt).toLocaleDateString()}</span>

                  {post.tags.length > 0 && (
                    <div className="flex gap-1">
                      {post.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="ml-auto flex gap-2">
                    {post.projectLink?.projectId && (
                      <Button asChild size="sm" variant="secondary">
                        <Link href={`/p/${post.projectLink.projectId}`}>
                          Open in Viewer
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </header>

              <div className="mt-6 overflow-hidden rounded-xl border bg-gradient-to-br from-slate-100 to-slate-200">
                {post.snapshot.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.snapshot.coverUrl}
                    alt={post.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[16/9] w-full items-center justify-center text-6xl">
                    🏙️
                  </div>
                )}
              </div>

              {post.body && (
                <div className="mt-6">
                  <p className="whitespace-pre-wrap text-muted-foreground">{post.body}</p>
                </div>
              )}

              <Separator className="my-8" />

              <Comments postId={postId} initialCount={post.counts.comments} />
            </>
          ) : (
            <div className="text-sm text-muted-foreground">Post not found</div>
          )}
        </section>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          {post && <RightActionBar post={post} onPostUpdate={setPost} />}
        </aside>
      </div>
    </main>
  );
}
