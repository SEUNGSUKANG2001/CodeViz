"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { CreateSnapshotResponse, CreatePostResponse } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

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
          <DialogTitle>Publish to community</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your visualization a title"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Repository</label>
            <Input value={repoUrl} readOnly className="bg-muted" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Describe your project..."
              className="min-h-[140px]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={onPublish} disabled={loading || !title.trim()}>
              {loading ? "Publishing..." : "Publish"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
