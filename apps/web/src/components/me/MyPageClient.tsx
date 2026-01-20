"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { MeResponse, MyProjectsResponse, ProjectCard as ProjectCardT } from "@/lib/types";
import { TopNav } from "@/components/nav/TopNav";
import { ProfileSidebar } from "@/components/me/ProfileSidebar";
import { NewProjectDialog } from "@/components/modals/NewProjectDialog";

export function MyPageClient() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [projects, setProjects] = useState<ProjectCardT[]>([]);
  const [tab, setTab] = useState<"all" | "draft" | "ready">("all");
  const [openNew, setOpenNew] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch<any>("/api/v1/auth/me");
        setMe({ ok: true, data: { user: res.data.user } });
      } catch {
        setMe({ ok: false, error: { code: "UNAUTHORIZED", message: "Login required" } });
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const qs = new URLSearchParams();
        qs.set("scope", "mine");
        qs.set("limit", "48");
        if (tab !== "all") qs.set("status", tab);
        const res = await apiFetch<MyProjectsResponse>(`/api/v1/projects?${qs.toString()}`);
        setProjects(res.data.items);
      } catch {
        setProjects([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [tab]);

  const isAuthed = me?.ok === true;

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

      <TopNav isAuthed={isAuthed} />

      <div className="relative z-10 mx-auto grid max-w-[1600px] grid-cols-1 gap-10 px-10 py-12 lg:grid-cols-[280px_1fr]">
        <ProfileSidebar me={me} />

        <section className="space-y-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[11px] font-medium tracking-[0.2em] text-neutral-500 uppercase">WORKSPACE</div>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">My Projects</h1>
              <p className="mt-2 text-sm text-neutral-400">
                Manage and analyze your repository visualizations.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setOpenNew(true)}
                disabled={!isAuthed}
                className="rounded-full bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                + New Project
              </button>
              <Link
                href="/me/edit"
                className="rounded-full border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-medium text-neutral-200 backdrop-blur-sm hover:bg-white/10 transition-all active:scale-95"
              >
                Edit Profile
              </Link>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 rounded-2xl bg-white/5 p-1 w-fit border border-white/5">
            {(["all", "draft", "ready"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-xl px-5 py-2 text-sm font-medium transition-all ${tab === t
                  ? "bg-white text-black shadow-xl"
                  : "text-neutral-400 hover:text-white hover:bg-white/5"
                  }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Grid */}
          {loading ? (
            <div className="flex items-center gap-3 py-20 justify-center">
              <div className="h-2 w-2 animate-bounce rounded-full bg-indigo-500" />
              <div className="h-2 w-2 animate-bounce rounded-full bg-indigo-500 [animation-delay:0.2s]" />
              <div className="h-2 w-2 animate-bounce rounded-full bg-indigo-500 [animation-delay:0.4s]" />
            </div>
          ) : projects.length === 0 ? (
            <div className="py-24 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-white/5 border border-white/10 mb-6">
                <svg className="h-10 w-10 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-white">No projects yet</h3>
              <p className="mt-2 text-sm text-neutral-500 max-w-[280px] mx-auto">
                Start by creating your first project to visualize your code.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-3">
              {projects.map((p) => (
                <Link key={p.id} href={`/p/${p.id}`} className="group relative block overflow-hidden rounded-3xl border border-white/5 bg-[#121212] transition-all hover:border-white/20 hover:shadow-2xl hover:shadow-indigo-500/10 active:scale-[0.98]">
                  <div className="relative aspect-[16/10] w-full overflow-hidden">
                    {p.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.coverUrl}
                        alt={p.title}
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                      />
                    ) : (
                      <div
                        className="h-full w-full transition duration-700 group-hover:scale-110 bg-gradient-to-br from-indigo-500/10 via-black to-black"
                      />
                    )}
                    <div className="absolute inset-x-4 top-4 flex justify-end">
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ring-1 ${p.status === "ready"
                          ? "bg-emerald-500/20 text-emerald-400 ring-emerald-500/30"
                          : "bg-amber-500/20 text-amber-400 ring-amber-500/30"
                          }`}
                      >
                        {p.status}
                      </span>
                    </div>
                  </div>

                  <div className="p-5">
                    <h3 className="line-clamp-1 text-base font-semibold text-white group-hover:text-indigo-400 transition-colors">
                      {p.title || "Untitled Project"}
                    </h3>
                    <div className="mt-2 flex items-center gap-2 overflow-hidden text-neutral-500">
                      <svg className="h-3.5 w-3.5 shrink-0 opacity-50" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                      </svg>
                      <span className="truncate text-xs font-medium opacity-60">
                        {p.repoUrl.replace('https://github.com/', '')}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <NewProjectDialog open={openNew} onOpenChange={setOpenNew} />
        </section>
      </div>
    </main>
  );
}
