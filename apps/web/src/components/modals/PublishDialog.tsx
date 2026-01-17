"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { CreateSnapshotResponse, CreatePostResponse } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  repoUrl: string;
  currentConfig: Record<string, unknown>;
  latestJobId: string | null;
};

export function PublishDialog({
  open,
  onOpenChange,
  projectId,
  repoUrl,
  currentConfig,
  latestJobId,
}: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  async function onPublish() {
    if (!title.trim()) {
      alert("Title is required");
      return;
    }

    setLoading(true);
    try {
      // 1) Create snapshot
      const snapRes = await apiFetch<CreateSnapshotResponse>(
        `/api/v1/projects/${projectId}/snapshots`,
        {
          method: "POST",
          json: {
            jobId: latestJobId,
            config: currentConfig,
            coverUploadId: null,
          },
        }
      );

      // 2) Create post
      const postRes = await apiFetch<CreatePostResponse>("/api/v1/posts", {
        method: "POST",
        json: {
          snapshotId: snapRes.data.snapshot.id,
          title,
          body: body || null,
          repoUrl,
          visibility: "public",
          tags: [(currentConfig?.theme as string) ?? "city"],
        },
      });

      onOpenChange(false);
      router.push(`/post/${postRes.data.post.id}`);
    } catch (e: unknown) {
      const error = e as Error;
      alert(error?.message ?? "Publish failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-neutral-900">Publish to community</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-900">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your visualization a title"
              className="w-full rounded-xl bg-neutral-100 px-4 py-3 text-sm outline-none placeholder:text-neutral-400 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-900">Repository</label>
            <input
              value={repoUrl}
              readOnly
              className="w-full rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-500 outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-900">Description</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Describe your project..."
              className="w-full min-h-[120px] rounded-xl bg-neutral-100 px-4 py-3 text-sm outline-none placeholder:text-neutral-400 focus:ring-2 focus:ring-indigo-500 resize-none"
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
              onClick={onPublish}
              disabled={loading || !title.trim()}
              className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:bg-neutral-200 disabled:text-neutral-500"
            >
              {loading ? "Publishing..." : "Publish"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
