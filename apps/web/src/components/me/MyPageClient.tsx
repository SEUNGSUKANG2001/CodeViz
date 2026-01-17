"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { MeResponse, MyProjectsResponse, ProjectCard as ProjectCardT } from "@/lib/types";
import { TopNav } from "@/components/nav/TopNav";
import { ProfileSidebar } from "@/components/me/ProfileSidebar";
import { ProjectGrid } from "@/components/grid/ProjectGrid";
import { NewProjectDialog } from "@/components/modals/NewProjectDialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

export function MyPageClient() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [projects, setProjects] = useState<ProjectCardT[]>([]);
  const [tab, setTab] = useState<"all" | "draft" | "ready">("all");
  const [openNew, setOpenNew] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch<{ ok: true; data: { user: MeResponse extends { ok: true; data: { user: infer U } } ? U : never } }>("/api/v1/auth/me");
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
    <main className="min-h-screen">
      <TopNav isAuthed={isAuthed} />
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-8 lg:grid-cols-[280px_1fr]">
        <ProfileSidebar me={me} />

        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold">My Projects</h1>
              <p className="text-sm text-muted-foreground">
                Draft = not shared. Ready = analyzed. Published lives in posts.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={() => setOpenNew(true)} disabled={!isAuthed}>
                + Project
              </Button>
              <Button asChild variant="secondary">
                <Link href="/me/edit">Edit Profile</Link>
              </Button>
            </div>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="draft">Draft</TabsTrigger>
              <TabsTrigger value="ready">Ready</TabsTrigger>
            </TabsList>
          </Tabs>

          {loading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : (
            <ProjectGrid items={projects} />
          )}

          <NewProjectDialog open={openNew} onOpenChange={setOpenNew} />
        </section>
      </div>
    </main>
  );
}
