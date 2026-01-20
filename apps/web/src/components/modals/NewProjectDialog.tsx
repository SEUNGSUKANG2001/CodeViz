"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { CreateProjectResponse } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function NewProjectDialog({ open, onOpenChange }: Props) {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState("");
  const [ref, setRef] = useState("main");
  const [loading, setLoading] = useState(false);
  const [repos, setRepos] = useState<any[]>([]);
  const [fetchingRepos, setFetchingRepos] = useState(false);

  useEffect(() => {
    if (open) {
      fetchRepos();
    }
  }, [open]);

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
    setRef(repo.defaultBranch || "main");
  };

  async function create() {
    if (!repoUrl.trim()) return;
    setLoading(true);
    try {
      const res = await apiFetch<CreateProjectResponse>("/api/v1/projects", {
        method: "POST",
        json: { repoUrl, ref },
      });
      onOpenChange(false);
      setRepoUrl("");
      setRef("main");
      router.push(`/p/${res.data.project.id}`);
    } catch (e: unknown) {
      const error = e as Error;
      alert(error?.message ?? "Failed to create project");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-neutral-900">New Project</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-900">
              Repository URL
            </label>
            <input
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/org/repo"
              className="w-full rounded-xl bg-neutral-100 px-4 py-3 text-sm outline-none placeholder:text-neutral-400 focus:ring-2 focus:ring-indigo-500"
            />

            {repos.length > 0 && (
              <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-neutral-100 bg-white p-1 shadow-sm">
                <p className="px-3 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Your GitHub Repositories
                </p>
                {repos.map((repo) => (
                  <button
                    key={repo.fullName}
                    onClick={() => handleSelectRepo(repo)}
                    className="w-full p-2 text-left text-sm hover:bg-neutral-50 rounded-lg transition-colors flex flex-col gap-0.5"
                  >
                    <span className="font-medium text-neutral-900">{repo.fullName}</span>
                    {repo.description && (
                      <span className="text-xs text-neutral-500 line-clamp-1">{repo.description}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
            {fetchingRepos && (
              <p className="mt-2 text-xs text-neutral-500 px-2 italic">Fetching your repositories...</p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-900">
              Branch / Ref
            </label>
            <input
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder="main"
              className="w-full rounded-xl bg-neutral-100 px-4 py-3 text-sm outline-none placeholder:text-neutral-400 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-full bg-neutral-100 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-200"
            >
              Cancel
            </button>
            <button
              onClick={create}
              disabled={loading || !repoUrl.trim()}
              className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:bg-neutral-200 disabled:text-neutral-500"
            >
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
