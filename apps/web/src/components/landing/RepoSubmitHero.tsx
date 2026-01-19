"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { CreateProjectResponse } from "@/lib/types";
import { TopNav } from "@/components/nav/TopNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RepoSubmitHero() {
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit() {
    if (!repoUrl.trim()) return;
    setLoading(true);
    try {
      const res = await apiFetch<CreateProjectResponse>("/api/v1/projects", {
        method: "POST",
        json: { repoUrl, ref: "main" },
      });
      router.push(`/p/${res.data.project.id}`);
    } catch (e: unknown) {
      const error = e as Error;
      alert(error?.message ?? "Failed to create project");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <TopNav />
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-semibold tracking-tight">
            Visualize your repository as a 3D world
          </h1>
          <p className="mt-3 text-muted-foreground">
            Paste a GitHub link, generate a code city, and share it with others.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Input
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/org/repo"
              className="h-11"
              onKeyDown={(e) => e.key === "Enter" && onSubmit()}
            />
            <Button className="h-11" onClick={onSubmit} disabled={loading}>
              {loading ? "Creating..." : "Transform"}
            </Button>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Tip: For MVP you can mock analysis results in the worker.
          </p>
        </div>
      </section>
    </>
  );
}
