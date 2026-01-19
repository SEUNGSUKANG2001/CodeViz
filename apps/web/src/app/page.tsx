"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { apiFetch } from "@/lib/api";
import type { FeedResponse, PostCard } from "@/lib/types";

const PlanetBackground = dynamic(() => import("@/components/planet/PlanetBackground"), {
  ssr: false,
});

const PostModal = dynamic(() => import("@/components/post/PostModal").then((m) => m.PostModal), {
  ssr: false,
});

const GraphThumbnail = dynamic(
  () => import("@/components/viewer/GraphThumbnail").then((m) => m.GraphThumbnail),
  { ssr: false }
);

function cn(...s: Array<string | false | null | undefined>) {
  return s.filter(Boolean).join(" ");
}

export default function LandingPage() {
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const [feed, setFeed] = useState<PostCard[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  const router = useRouter();

  const onTransform = async () => {
    if (!repoUrl) return;
    setLoading(true);
    try {
      const res = await fetch("/api/v1/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/api/v1/auth/kakao/start");
          return;
        }
        alert(data.error?.message || "Failed to create project");
        return;
      }
      router.push(`/p/${data.data.project.id}`);
    } catch {
      alert("Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch<FeedResponse>("/api/v1/feed?limit=12");
        setFeed(res.data.items);
      } catch {
        // ignore
      } finally {
        setFeedLoading(false);
      }
    })();
  }, []);

  return (
    <main className="relative min-h-screen bg-black text-white">
      {/* ================== HERO BACKGROUND: render ONLY ================== */}
      {/* ✅ 여기에는 어떠한 오버레이/그리드/블러도 안 얹음 */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <PlanetBackground />
      </div>

      {/* ================= HERO SECTION ================= */}
      <section className="relative z-10 min-h-[78vh] px-10 pt-7">
        <div className="mx-auto flex max-w-[1600px] flex-col">
          {/* header */}
          <header className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="relative h-9 w-9 rounded-2xl border border-white/15 bg-white/5">
                <div className="absolute left-2 top-2 h-2 w-2 rounded-full bg-cyan-300" />
              </div>
              <span className="text-sm font-semibold tracking-[0.18em] text-white/90">
                CODEVIZ
              </span>
            </Link>

            <div className="flex items-center gap-2">
              <Link
                href="/feed"
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/85 hover:bg-white/10"
              >
                Explore
              </Link>
              <button
                onClick={() => router.push("/api/v1/auth/kakao/start")}
                className="rounded-full bg-cyan-300/90 px-4 py-2 text-sm font-medium text-black hover:bg-cyan-200"
              >
                Login
              </button>
            </div>
          </header>

          {/* hero content (text only) */}
          <div className="mt-16 max-w-3xl">
            <div
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[11px] text-white/85"
              style={{ textShadow: "0 2px 18px rgba(0,0,0,0.55)" }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
              Code as spatial structure
            </div>

            <h1
              className="mt-7 text-4xl font-semibold tracking-tight md:text-6xl text-white"
              style={{ textShadow: "0 10px 30px rgba(0,0,0,0.7)" }}
            >
              Read complex code
              <span className="block text-white/90">as architecture</span>
            </h1>

            <p
              className="mt-5 max-w-xl text-base text-white/75"
              style={{ textShadow: "0 8px 22px rgba(0,0,0,0.65)" }}
            >
              Visualize repositories as navigable 3D structures. Discover dependencies, growth,
              and hotspots at a glance.
            </p>

            <div className="mt-10 max-w-xl">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex-1 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 backdrop-blur-[2px]">
                  <input
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="Paste GitHub repository URL"
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/45"
                  />
                </div>

                <button
                  onClick={onTransform}
                  disabled={!repoUrl || loading}
                  className={cn(
                    "rounded-2xl px-5 py-3 text-sm font-medium transition",
                    loading
                      ? "bg-white/15 text-white/60"
                      : "bg-cyan-300/90 text-black hover:bg-cyan-200"
                  )}
                  style={{ boxShadow: "0 10px 30px rgba(0,0,0,0.35)" }}
                >
                  {loading ? "Transforming…" : "Transform"}
                </button>
              </div>

              <div
                className="mt-3 text-[11px] text-white/55"
                style={{ textShadow: "0 6px 18px rgba(0,0,0,0.7)" }}
              >
                Smaller repositories analyze faster · Private repos coming soon
              </div>

              <div className="mt-6 flex flex-wrap gap-2 text-[11px] text-white/70">
                {["3D Viewer", "Snapshots", "Posts", "Comments"].map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-white/15 bg-white/5 px-3 py-1"
                    style={{ textShadow: "0 6px 18px rgba(0,0,0,0.7)" }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* gentle divider (transparent) */}
          <div className="mt-auto pt-10">
            <div className="h-px w-full bg-white/10" />
          </div>
        </div>
      </section>

      {/* ================= GALLERY (BLACK BACKGROUND 유지) ================= */}
      <section className="relative z-10 bg-black px-10 pb-24 pt-14">
        <div className="mx-auto max-w-[1600px]">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <div className="text-[11px] tracking-[0.18em] text-white/55">COMMUNITY</div>
              <h2 className="mt-2 text-2xl font-semibold text-white/92">
                Latest visualizations
              </h2>
              <p className="mt-1 text-sm text-white/65">Public projects shared by developers.</p>
            </div>

            <Link
              href="/feed"
              className="text-sm text-white/85 underline decoration-white/25 underline-offset-4 hover:decoration-white/70"
            >
              View all
            </Link>
          </div>

          {/* ✅ 간격 좁힘 */}
          <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {feedLoading && (
              <div className="col-span-full text-sm text-white/60">Loading latest posts...</div>
            )}
            {!feedLoading && feed.length === 0 && (
              <div className="col-span-full text-sm text-white/60">No public posts yet.</div>
            )}

            {feed.map((item) => (
              <button
                key={item.postId}
                type="button"
                onClick={() => setSelectedPostId(item.postId)}
                className="group block text-left"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <div className="pointer-events-none absolute inset-0 border border-white/10" />
                  <GraphThumbnail
                    jobId={item.jobId ?? null}
                    jobStatus={item.jobStatus ?? null}
                    coverUrl={item.coverUrl}
                    title={item.title}
                    theme={(item.theme as any) || "Thema1"}
                    className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/10" />
                </div>

                <div className="mt-2">
                  <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-white/92">
                    {item.title}
                  </h3>

                  <div className="mt-1 flex items-center justify-between text-xs text-white/60">
                    <span className="truncate">@{item.author.username ?? "user"}</span>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-1 w-1 rounded-full bg-white/25" />
                      {item.likeCount} · {item.commentCount}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10 bg-black py-10 text-center text-xs text-white/55">
        © {new Date().getFullYear()} Codeviz · Visual code as a shareable artifact
      </footer>

      {selectedPostId && (
        <PostModal postId={selectedPostId} onClose={() => setSelectedPostId(null)} />
      )}
    </main>
  );
}