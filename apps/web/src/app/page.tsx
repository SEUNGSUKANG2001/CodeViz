"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { apiFetch } from "@/lib/api";
import type { FeedResponse, PostCard, MeResponse, Author } from "@/lib/types";

const PlanetBackground = dynamic<any>(
  () => import("@/components/planet/PlanetBackground"),
  { ssr: false }
);

function cn(...s: Array<string | false | null | undefined>) {
  return s.filter(Boolean).join(" ");
}

export default function LandingPage() {
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [feed, setFeed] = useState<PostCard[]>([]);
  const [user, setUser] = useState<Author | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [targetProgress, setTargetProgress] = useState(0);
  const [repos, setRepos] = useState<any[]>([]);
  const [fetchingRepos, setFetchingRepos] = useState(false);
  const [showRepos, setShowRepos] = useState(false);
  const progressRef = useRef(0);
  const isAnimatingRef = useRef(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const DEBUG_PLANET = false;

  useEffect(() => {
    progressRef.current = scrollProgress;
  }, [scrollProgress]);

  useEffect(() => {
    const onWheel = () => {
      if (isAnimatingRef.current) return;
      const current = progressRef.current;
      const nextTarget = current > 0.5 ? 0 : 1;
      setTargetProgress(nextTarget);
      if (DEBUG_PLANET) console.log("Scroll trigger ->", nextTarget);
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowRepos(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      setScrollProgress((prev) => {
        const t = 1 - Math.exp(-2.6 * dt);
        const next = prev + (targetProgress - prev) * t;
        progressRef.current = next;
        isAnimatingRef.current = Math.abs(targetProgress - next) > 0.002;
        return next;
      });
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [targetProgress]);

  useEffect(() => {
    (async () => {
      try {
        const [feedRes, meRes] = await Promise.all([
          apiFetch<FeedResponse>("/api/v1/feed?limit=8"),
          apiFetch<MeResponse>("/api/v1/auth/me")
        ]);
        setFeed(feedRes.data.items);
        if (meRes.ok) {
          setUser(meRes.data.user);
          fetchRepos();
        }
      } catch {
        // Silently fail for feed/auth
      }
    })();
  }, []);

  async function fetchRepos() {
    setFetchingRepos(true);
    try {
      const res = await apiFetch<{ ok: boolean; data: { repos: any[] } }>("/api/v1/users/me/github-repos");
      if (res.ok) {
        setRepos(res.data.repos);
      }
    } catch (e) {
      console.error("Failed to fetch repos", e);
    } finally {
      setFetchingRepos(false);
    }
  }

  const handleSelectRepo = (repo: any) => {
    setRepoUrl(repo.htmlUrl);
    setShowRepos(false);
  };

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
          // router.push("/api/v1/auth/kakao/start");
          router.push("/api/v1/auth/github/start");
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

  return (
    <main className="relative min-h-[200vh] overflow-hidden text-white">
      <div className="fixed inset-0 -z-10">
        <PlanetBackground feedItems={feed} scrollProgress={scrollProgress} />
      </div>

      <section className="relative z-10 min-h-[100vh] px-10 pt-8 pointer-events-none">
        <div
          className="mx-auto flex max-w-[1600px] flex-col"
          style={{
            transform: `translateY(${-scrollProgress * 120}px)`,
          }}
        >
          <header className="flex items-center justify-between pointer-events-auto">
            <Link href="/" className="flex items-center gap-3">
              <div className="relative h-9 w-9 rounded-none border border-white/15 bg-white/5">
                <div className="absolute left-2 top-2 h-2 w-2 rounded-full bg-cyan-300" />
              </div>
              <span className="text-sm font-semibold tracking-[0.18em] text-white/90">
                CODEVIZ
              </span>
            </Link>

            <div className="flex items-center gap-4">
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-medium text-white/90">
                      {user.displayName || user.username}
                    </span>
                    <button
                      onClick={async () => {
                        await fetch("/api/v1/auth/logout", { method: "POST" });
                        window.location.reload();
                      }}
                      className="text-[10px] text-white/40 hover:text-white/60"
                    >
                      Logout
                    </button>
                  </div>
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.displayName || "Avatar"}
                      className="h-8 w-8 rounded-full border border-white/10"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[10px]">
                      {user.username?.[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  // onClick={() => router.push("/api/v1/auth/kakao/start")}
                  onClick={() => router.push("/api/v1/auth/github/start")}
                  className="rounded-full bg-cyan-300/90 px-4 py-2 text-sm font-medium text-black hover:bg-cyan-200"
                >
                  Login
                </button>
              )}
            </div>
          </header>

          <div className="mt-20 max-w-3xl pointer-events-auto">
            <div
              className="inline-flex items-center gap-2 rounded-none border border-cyan-400/30 bg-cyan-400/5 px-4 py-1.5 text-[11px] font-medium tracking-widest text-cyan-300/90 uppercase"
              style={{
                textShadow: "0 0 12px rgba(34, 211, 238, 0.4)",
                boxShadow: "inset 0 0 12px rgba(34, 211, 238, 0.05)"
              }}
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-300"></span>
              </span>
              Code as spatial structure
            </div>

            <h1
              className="mt-7 text-4xl font-semibold tracking-tight md:text-6xl"
              style={{ textShadow: "0 12px 34px rgba(0,0,0,0.75)" }}
            >
              Read complex code
              <span className="block text-white/90">as architecture</span>
            </h1>

            <p
              className="mt-5 max-w-xl text-base text-white/75"
              style={{ textShadow: "0 10px 26px rgba(0,0,0,0.7)" }}
            >
              Visualize repositories as navigable 3D structures.
              Discover dependencies, growth, and hotspots at a glance.
            </p>

            <div className="mt-10 max-w-xl">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex-1 rounded-none border border-white/15 bg-white/5 px-4 py-3 backdrop-blur-[2px]">
                  <input
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    onFocus={() => setShowRepos(true)}
                    placeholder="Paste GitHub repository URL"
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/45"
                  />
                </div>

                <button
                  onClick={onTransform}
                  disabled={!repoUrl || loading}
                  className={cn(
                    "rounded-none px-5 py-3 text-sm font-medium transition",
                    loading
                      ? "bg-white/15 text-white/60"
                      : "bg-cyan-300/90 text-black hover:bg-cyan-200"
                  )}
                  style={{ boxShadow: "0 12px 36px rgba(0,0,0,0.45)" }}
                >
                  {loading ? "Transforming..." : "Transform"}
                </button>
              </div>

              <div className="relative" ref={dropdownRef}>
                {showRepos && (repos.length > 0 || fetchingRepos) && (
                  <div className="absolute left-0 right-0 top-2 z-50 max-h-60 overflow-y-auto border border-white/15 bg-neutral-900/90 backdrop-blur-md p-1 shadow-2xl">
                    {fetchingRepos ? (
                      <p className="px-4 py-3 text-xs text-white/40 italic">Fetching your repositories...</p>
                    ) : (
                      <>
                        <p className="px-3 py-2 text-[10px] font-semibold text-white/30 uppercase tracking-[0.2em]">
                          Your GitHub Repositories
                        </p>
                        {repos.map((repo) => (
                          <button
                            key={repo.fullName}
                            onClick={() => handleSelectRepo(repo)}
                            className="w-full px-4 py-3 text-left text-sm hover:bg-white/5 transition-colors flex flex-col gap-1 border-b border-white/5 last:border-0"
                          >
                            <span className="font-medium text-white/90">{repo.fullName}</span>
                            {repo.description && (
                              <span className="text-xs text-white/40 line-clamp-1">{repo.description}</span>
                            )}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>

              <div
                className="mt-3 text-[11px] text-white/55"
                style={{ textShadow: "0 6px 18px rgba(0,0,0,0.7)" }}
              >
                Smaller repositories analyze faster · Private repos coming soon
              </div>
            </div>
          </div>

          <div className="mt-auto pb-10 text-xs text-white/50">
            Scroll to explore the universe ↓
          </div>
        </div>
      </section>

      <section className="h-[100vh]" />
    </main>
  );
}
