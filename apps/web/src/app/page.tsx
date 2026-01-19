"use client";

import { useState } from "react";
import Link from "next/link";

type FeedItem = {
  id: string;
  title: string;
  description: string;
  author: string;
  likes: number;
  comments: number;
};

const MOCK_FEED: FeedItem[] = [
  {
    id: "1",
    title: "Monorepo Dependency Galaxy",
    description: "Large-scale TS monorepo visualized as clustered star systems.",
    author: "amadeus",
    likes: 42,
    comments: 6,
  },
  {
    id: "2",
    title: "Microservice Constellations",
    description: "Service boundaries rendered as orbital clusters with traffic lanes.",
    author: "nina",
    likes: 18,
    comments: 3,
  },
  {
    id: "3",
    title: "Legacy Refactor Targets",
    description: "Complexity hotspots mapped as unstable industrial zones.",
    author: "jay",
    likes: 9,
    comments: 1,
  },
  {
    id: "4",
    title: "Frontend Module Districts",
    description: "Shared UI components form central service hubs.",
    author: "soyeon",
    likes: 27,
    comments: 11,
  },
  {
    id: "5",
    title: "Backend Service Highways",
    description: "High traffic routes highlighted with dependency flows.",
    author: "min",
    likes: 15,
    comments: 2,
  },
  {
    id: "6",
    title: "UI Component Ecosystem",
    description: "Design system components clustered by usage frequency.",
    author: "alex",
    likes: 33,
    comments: 7,
  },
  {
    id: "7",
    title: "GraphQL Data Flow City",
    description: "Resolver relationships mapped as layered transport routes.",
    author: "haru",
    likes: 21,
    comments: 4,
  },
  {
    id: "8",
    title: "Cloud Infra Topology",
    description: "Infrastructure components rendered as connected districts.",
    author: "lee",
    likes: 12,
    comments: 3,
  },
];

function cn(...s: Array<string | false | null | undefined>) {
  return s.filter(Boolean).join(" ");
}

export default function LandingPage() {
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);

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
        // If unauthorized, redirect to login
        if (res.status === 401) {
          window.location.href = "/api/v1/auth/kakao/start";
          return;
        }
        alert(data.error?.message || "Failed to create project");
        return;
      }
      // Redirect to the project viewer page
      window.location.href = `/p/${data.data.project.id}`;
    } catch (err) {
      alert("Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen bg-[#fbfbfc] text-neutral-900">
      {/* ===== Gallery Background: subtle paper + faint grid ===== */}
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

      {/* ================= HEADER ================= */}
      <header className="relative z-10 w-full px-10 py-7">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            {/* minimal mark */}
            <div className="relative h-9 w-9 rounded-2xl border border-neutral-300 bg-white">
              <div className="absolute left-2 top-2 h-2 w-2 rounded-full bg-indigo-600" />
            </div>
            <span className="text-sm font-semibold tracking-[0.18em] text-neutral-900">
              CODEVIZ
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/feed"
              className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm hover:bg-neutral-50"
            >
              Explore
            </Link>
            <button
              onClick={() => (window.location.href = "/api/v1/auth/kakao/start")}
              className="rounded-full bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800"
            >
              Login
            </button>
          </div>
        </div>
      </header>

      {/* ================= HERO ================= */}
      <section className="relative z-10 px-10 pt-8">
        <div className="mx-auto max-w-[1600px]">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-4 py-1.5 text-[11px] text-neutral-600">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
              Code as space · structure · work
            </div>

            <h1 className="mt-7 text-4xl font-semibold tracking-tight md:text-6xl">
              A calmer way to read
              <span className="block text-neutral-900">
                complex codebases
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-base text-neutral-600">
              Turn a GitHub repository into an interactive 3D artifact.
              Explore dependencies, hotspots, and architecture like a gallery piece.
            </p>

            {/* Input (gallery form) */}
            <div className="mx-auto mt-10 max-w-2xl">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <div className="rounded-2xl border border-neutral-300 bg-white px-4 py-3">
                    <input
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      placeholder="Paste GitHub repository URL"
                      className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
                    />
                  </div>
                  <div className="mt-2 text-[11px] text-neutral-500">
                    Private repos: coming soon · Smaller repos analyze faster.
                  </div>
                </div>

                <button
                  onClick={onTransform}
                  disabled={!repoUrl || loading}
                  className={cn(
                    "rounded-2xl px-5 py-3 text-sm font-medium transition",
                    loading
                      ? "bg-neutral-200 text-neutral-500"
                      : "bg-indigo-600 text-white hover:bg-indigo-500"
                  )}
                >
                  {loading ? "Transforming…" : "Transform"}
                </button>
              </div>

              {/* minimal feature row */}
              <div className="mt-6 flex flex-wrap justify-center gap-2 text-[11px] text-neutral-600">
                {["3D Viewer", "Snapshots", "Posts", "Comments"].map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-neutral-300 bg-white px-3 py-1"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* subtle divider */}
          <div className="mx-auto mt-14 max-w-[1600px]">
            <div className="h-px w-full bg-neutral-200" />
          </div>
        </div>
      </section>

      {/* ================= GALLERY FEED ================= */}
      <section className="relative z-10 w-full px-10 pb-24 pt-12">
        <div className="mx-auto max-w-[1600px]">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <div className="text-[11px] tracking-[0.18em] text-neutral-500">
                COMMUNITY
              </div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                Latest visualizations
              </h2>
              <p className="mt-1 text-sm text-neutral-600">
                Public projects shared by developers.
              </p>
            </div>

            <Link
              href="/feed"
              className="text-sm text-neutral-900 underline decoration-neutral-300 underline-offset-4 hover:decoration-neutral-900"
            >
              View all
            </Link>
          </div>

          {/* No card box: gallery tiles */}
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {MOCK_FEED.map((item) => (
              <Link key={item.id} href={`/posts/${item.id}`} className="group block">
                <div className="overflow-hidden rounded-2xl bg-neutral-100">
                  <div className="aspect-[4/3] w-full">
                    <div
                      className="h-full w-full transition duration-500 group-hover:scale-[1.03]"
                      style={{
                        backgroundImage:
                          "radial-gradient(circle at 35% 40%, rgba(79,70,229,0.16), transparent 50%), radial-gradient(circle at 70% 65%, rgba(0,0,0,0.10), transparent 52%), linear-gradient(135deg, rgba(255,255,255,0.86), rgba(255,255,255,0))",
                      }}
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-neutral-900">
                      {item.title}
                    </h3>
                    <div className="shrink-0 text-xs text-neutral-500">
                      {item.likes}
                    </div>
                  </div>

                  <p className="mt-1 line-clamp-2 text-sm text-neutral-600">
                    {item.description}
                  </p>

                  <div className="mt-2 flex items-center justify-between text-xs text-neutral-500">
                    <span className="truncate">@{item.author}</span>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-1 w-1 rounded-full bg-neutral-300" />
                      {item.comments} comments
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="relative z-10 border-t border-neutral-200 py-10 text-center text-xs text-neutral-500">
        <div className="mx-auto max-w-[1600px] px-10">
          © {new Date().getFullYear()} Codeviz · Visual code as a shareable artifact
        </div>
      </footer>
    </main>
  );
}