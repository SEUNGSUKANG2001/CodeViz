"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { apiFetch } from "@/lib/api";
import type { FeedResponse, PostCard } from "@/lib/types";

const PlanetBackground = dynamic(
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
  const [scrollProgress, setScrollProgress] = useState(0);
  const [targetProgress, setTargetProgress] = useState(0);
  const progressRef = useRef(0);
  const isAnimatingRef = useRef(false);

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
        const res = await apiFetch<FeedResponse>("/api/v1/feed?limit=8");
        setFeed(res.data.items);
      } catch {
        setFeed([]);
      }
    })();
  }, []);

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

      <section className="relative z-10 min-h-[100vh] px-10 pt-8">
        <div
          className="mx-auto flex max-w-[1600px] flex-col"
          style={{
            transform: `translateY(${-scrollProgress * 120}px)`,
          }}
        >
          <header className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="relative h-9 w-9 rounded-none border border-white/15 bg-white/5">
                <div className="absolute left-2 top-2 h-2 w-2 rounded-full bg-cyan-300" />
              </div>
              <span className="text-sm font-semibold tracking-[0.18em] text-white/90">
                CODEVIZ
              </span>
            </Link>

            <div className="flex items-center gap-2">
              <button
                // onClick={() => router.push("/api/v1/auth/kakao/start")}
                onClick={() => router.push("/api/v1/auth/github/start")}
                className="rounded-full bg-cyan-300/90 px-4 py-2 text-sm font-medium text-black hover:bg-cyan-200"
              >
                Login
              </button>
            </div>
          </header>

          <div className="mt-20 max-w-3xl">
            <div
              className="inline-flex items-center gap-2 rounded-none border border-white/15 bg-white/5 px-4 py-1.5 text-[11px] text-white/85"
              style={{ textShadow: "0 2px 18px rgba(0,0,0,0.6)" }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
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
