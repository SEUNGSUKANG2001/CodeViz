"use client";

import { useState } from "react";
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
