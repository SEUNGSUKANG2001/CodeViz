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
  const [isImmersive, setIsImmersive] = useState(false);

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
    <main className="relative min-h-screen bg-[#050505] text-white">
      {/* Background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          className="absolute -top-[10%] -left-[10%] h-[60%] w-[60%] rounded-full opacity-[0.15] blur-[120px]"
          style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.8), transparent 70%)' }}
        />
        <div
          className="absolute -bottom-[10%] -right-[10%] h-[50%] w-[50%] rounded-full opacity-[0.1] blur-[120px]"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.4), transparent 70%)' }}
        />
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <TopNav isAuthed={!!post} />

      <div className="relative z-10 mx-auto grid max-w-[1600px] grid-cols-1 gap-12 px-10 pt-8 pb-16 lg:grid-cols-[1fr_280px]">
        {/* Main */}
        <section>
          {loading ? (
            <div className="text-sm text-neutral-500">Loading...</div>
          ) : post ? (
            <>
              {/* Header */}
              <header className="space-y-4">
                <h1 className="text-4xl font-bold tracking-tight text-white leading-tight">
                  {post.title}
                </h1>

                <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-400">
                  <Link
                    href={authorHref}
                    className="flex items-center gap-2 hover:text-white transition-colors"
                  >
                    <div className="h-6 w-6 rounded-full bg-white/5 overflow-hidden ring-1 ring-white/10">
                      {post.author.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={post.author.avatarUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] font-medium text-neutral-500">
                          {post.author.displayName?.[0] ?? "U"}
                        </div>
                      )}
                    </div>
                    <span className="font-medium">{post.author.displayName ?? "User"}</span>
                  </Link>

                  <span className="h-1 w-1 rounded-full bg-neutral-800" />
                  <span className="text-neutral-500">
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
                          className="rounded-full bg-white/5 border border-white/5 px-2 py-0.5 text-xs text-neutral-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {post.projectLink?.projectId && (
                    <button
                      onClick={() => setIsImmersive(true)}
                      className="ml-auto rounded-full bg-white px-4 py-1.5 text-sm font-bold text-black hover:bg-neutral-200 transition-all active:scale-95"
                    >
                      Open in Viewer
                    </button>
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
                  planet={post.planet ?? null}
                  immersive={isImmersive}
                  onClose={() => setIsImmersive(false)}
                  projectId={post.projectLink?.projectId ?? null}
                  history={post.snapshot.history}
                  snapshots={post.snapshot.snapshots}
                />
              </div>

              {/* Body */}
              {post.body && (
                <div className="mt-10">
                  <p className="whitespace-pre-wrap text-neutral-300 leading-relaxed text-lg">
                    {post.body}
                  </p>
                </div>
              )}

              {/* Comments */}
              <div className="mt-12 pt-8 border-t border-white/10">
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
