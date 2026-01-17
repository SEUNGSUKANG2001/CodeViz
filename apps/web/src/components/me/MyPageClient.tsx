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

      <TopNav isAuthed={isAuthed} />

      <div className="relative z-10 mx-auto grid max-w-[1600px] grid-cols-1 gap-10 px-10 py-12 lg:grid-cols-[280px_1fr]">
        <ProfileSidebar me={me} />

        <section className="space-y-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[11px] tracking-[0.18em] text-neutral-500">WORKSPACE</div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">My Projects</h1>
              <p className="mt-1 text-sm text-neutral-500">
                Draft = not shared · Ready = analyzed · Published in Feed
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setOpenNew(true)}
                disabled={!isAuthed}
                className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:bg-neutral-200 disabled:text-neutral-500"
              >
                + New Project
              </button>
              <Link
                href="/me/edit"
                className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm hover:bg-neutral-50"
              >
                Edit Profile
              </Link>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1">
            {(["all", "draft", "ready"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-full px-4 py-1.5 text-sm capitalize transition ${
                  tab === t
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Grid */}
          {loading ? (
            <div className="text-sm text-neutral-500">Loading...</div>
          ) : projects.length === 0 ? (
            <div className="py-16 text-center text-sm text-neutral-500">
              No projects yet. Create one to get started!
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 xl:grid-cols-3">
              {projects.map((p) => (
                <Link key={p.id} href={`/p/${p.id}`} className="group block">
                  <div className="overflow-hidden rounded-2xl bg-neutral-100">
                    <div className="aspect-[4/3] w-full">
                      {p.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.coverUrl}
                          alt={p.title}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div
                          className="h-full w-full transition duration-500 group-hover:scale-[1.03]"
                          style={{
                            backgroundImage:
                              "radial-gradient(circle at 35% 40%, rgba(79,70,229,0.16), transparent 50%), radial-gradient(circle at 70% 65%, rgba(0,0,0,0.10), transparent 52%), linear-gradient(135deg, rgba(255,255,255,0.86), rgba(255,255,255,0))",
                          }}
                        />
                      )}
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-neutral-900">
                        {p.title || "Untitled"}
                      </h3>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                          p.status === "ready"
                            ? "bg-indigo-50 text-indigo-600"
                            : "bg-neutral-100 text-neutral-500"
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-neutral-500">{p.repoUrl}</p>
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
