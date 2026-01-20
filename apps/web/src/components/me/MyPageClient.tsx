"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { MeResponse, MyProjectsResponse, ProjectCard as ProjectCardT } from "@/lib/types";
import { TopNav } from "@/components/nav/TopNav";
import { ProfileSidebar } from "@/components/me/ProfileSidebar";
import { NewProjectDialog } from "@/components/modals/NewProjectDialog";

import { ProjectCard } from "@/components/cards/ProjectCard";

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

  async function onDeleteProject(projectId: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
      return;
    }

    try {
      await apiFetch(`/api/v1/projects/${projectId}`, {
        method: "DELETE",
      });
      // Update local state for instant feedback
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch (err: any) {
      alert(err.message || "Failed to delete project");
    }
  }

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
                <ProjectCard key={p.id} project={p} onDelete={onDeleteProject} />
              ))}
            </div>
          )
          }

          <NewProjectDialog open={openNew} onOpenChange={setOpenNew} />
        </section>
      </div>
    </main>
  );
}
