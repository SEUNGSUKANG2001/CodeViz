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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
          <DialogTitle>New Project</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Repository URL
            </label>
            <Input
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/org/repo"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Branch / Ref
            </label>
            <Input
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder="main"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={create} disabled={loading || !repoUrl.trim()}>
              {loading ? "Creating..." : "Create"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
