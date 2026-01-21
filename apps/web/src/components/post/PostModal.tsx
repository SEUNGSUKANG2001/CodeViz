"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { PostDetail, PostDetailResponse } from "@/lib/types";
import { Comments } from "@/components/post/Comments";
import { PostVisualization } from "@/components/post/PostVisualization";
import { PostActionDock } from "@/components/post/PostActionDock";
import type { ThemeType } from "@/components/viewer/useCodeCityViewer";

type Props = {
  postId: string;
  onClose: () => void;
};

export function PostModal({ postId, onClose }: Props) {
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

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50">
      <button
        className="absolute inset-0 bg-black/70"
        aria-label="Close"
        onClick={onClose}
      />

      <div className="relative mx-auto flex h-full w-full max-w-[1400px] items-start justify-center px-6 py-0">
        <div className="relative h-[100dvh] w-full rounded-none bg-white shadow-2xl ring-1 ring-black/5">
          <button
            onClick={onClose}
            className="absolute right-6 top-6 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4 text-neutral-700" />
          </button>

          <div className="h-full overflow-y-auto px-12 py-12">
            {loading ? (
              <div className="text-sm text-neutral-500">Loading...</div>
            ) : post ? (
              <>
                <header className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <h1 className="text-3xl font-semibold tracking-tight">{post.title}</h1>
                    {post.projectLink?.projectId && (
                      <Link
                        href={`/p/${post.projectLink.projectId}`}
                        className="rounded-full bg-neutral-900 px-3 py-1.5 text-sm text-white hover:bg-neutral-800"
                      >
                        Open in Viewer
                      </Link>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-500">
                    <Link href={authorHref} className="flex items-center gap-2 hover:text-neutral-900">
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
                  </div>
                </header>

                <div className="mt-8">
                  <PostVisualization
                    jobId={post.snapshot.job?.id ?? null}
                    jobStatus={post.snapshot.job?.status ?? null}
                    coverUrl={post.snapshot.coverUrl}
                    title={post.title}
                    theme={theme}
                    planet={post.planet ?? null}
                  />
                </div>

                {post.body && (
                  <div className="mt-8">
                    <p className="whitespace-pre-wrap text-neutral-700 leading-relaxed">
                      {post.body}
                    </p>
                  </div>
                )}

                <div className="mt-10 pt-8 border-t border-neutral-200">
                  <Comments postId={postId} initialCount={post.counts.comments} />
                </div>
              </>
            ) : (
              <div className="text-sm text-neutral-500">Post not found</div>
            )}
          </div>
        </div>

        {post && (
          <div className="pointer-events-none absolute right-6 top-24 md:-right-10">
            <div className="pointer-events-auto">
              <PostActionDock post={post} onPostUpdate={setPost} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
