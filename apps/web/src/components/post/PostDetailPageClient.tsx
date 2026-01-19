"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { PostDetail, PostDetailResponse } from "@/lib/types";
import { TopNav } from "@/components/nav/TopNav";
import { Comments } from "@/components/post/Comments";
import { RightActionBar } from "@/components/post/RightActionBar";
import { PostVisualization } from "@/components/post/PostVisualization";
import type { ThemeType } from "@/components/viewer/useCodeCityViewer";

export function PostDetailPageClient({ postId }: { postId: string }) {
  const [post, setPost] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const authorHref = useMemo(() => (post ? `/u/${post.author.id}` : "#"), [post]);
  const theme = (post?.snapshot.config?.theme as ThemeType) || "Thema1";

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
    <main className="relative min-h-screen bg-[#fbfbfc] text-neutral-900">
      {/* Background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(circle at 18% 12%, rgba(79,70,229,0.06), transparent 45%),
            radial-gradient(circle at 80% 18%, rgba(0,0,0,0.06), transparent 46%),
            linear-gradient(180deg, rgba(255,255,255,0.0) 0%, rgba(0,0,0,0.02) 100%)
          `,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.10]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(0,0,0,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.12) 1px, transparent 1px)",
          backgroundSize: "96px 96px",
        }}
      />

      <TopNav />

      <div className="relative z-10 mx-auto grid max-w-[1600px] grid-cols-1 gap-12 px-10 pt-8 pb-16 lg:grid-cols-[1fr_280px]">
        {/* Main */}
        <section>
          {loading ? (
            <div className="text-sm text-neutral-500">Loading...</div>
          ) : post ? (
            <>
              {/* Header */}
              <header className="space-y-4">
                <h1 className="text-3xl font-semibold tracking-tight">
                  {post.title}
                </h1>

                <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-500">
                  <Link
                    href={authorHref}
                    className="flex items-center gap-2 hover:text-neutral-900"
                  >
                    <div className="h-6 w-6 rounded-full bg-neutral-100 overflow-hidden">
                      {post.author.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={post.author.avatarUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-medium text-neutral-400">
                          {post.author.displayName?.[0] ?? "U"}
                        </div>
                      )}
                    </div>
                    <span>{post.author.displayName ?? "User"}</span>
                  </Link>

                  <span className="h-1 w-1 rounded-full bg-neutral-300" />
                  <span>
                    {new Date(post.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>

                  {post.tags.length > 0 && (
                    <div className="flex gap-1">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {post.projectLink?.projectId && (
                    <Link
                      href={`/p/${post.projectLink.projectId}`}
                      className="ml-auto rounded-full bg-neutral-900 px-3 py-1.5 text-sm text-white hover:bg-neutral-800"
                    >
                      Open in Viewer
                    </Link>
                  )}
                </div>
              </header>

              {/* Visualization */}
              <div className="mt-10">
                <PostVisualization
                  jobId={post.snapshot.job?.id ?? null}
                  jobStatus={post.snapshot.job?.status ?? null}
                  coverUrl={post.snapshot.coverUrl}
                  title={post.title}
                  theme={theme}
                />
              </div>

              {/* Body */}
              {post.body && (
                <div className="mt-10">
                  <p className="whitespace-pre-wrap text-neutral-700 leading-relaxed">
                    {post.body}
                  </p>
                </div>
              )}

              {/* Comments */}
              <div className="mt-12 pt-8 border-t border-neutral-200">
                <Comments postId={postId} initialCount={post.counts.comments} />
              </div>
            </>
          ) : (
            <div className="text-sm text-neutral-500">Post not found</div>
          )}
        </section>

        {/* Sidebar */}
        <aside className="lg:sticky lg:top-8 lg:self-start">
          {post && <RightActionBar post={post} onPostUpdate={setPost} />}
        </aside>
      </div>
    </main>
  );
}
