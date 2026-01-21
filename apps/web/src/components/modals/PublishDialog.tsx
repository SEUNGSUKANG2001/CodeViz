"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { CreateSnapshotResponse, CreatePostResponse } from "@/lib/types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  repoUrl: string;
  currentConfig: Record<string, unknown>;
  latestJobId: string | null;
  captureScreenshot?: (() => Promise<string>) | null;
};

export function PublishDialog({
  open,
  onOpenChange,
  projectId,
  repoUrl,
  currentConfig,
  latestJobId,
  captureScreenshot,
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
      let coverUploadId = null;

      // 0) Capture and Upload Screenshot
      if (captureScreenshot) {
        try {
          console.log("[Publish] Capturing screenshot...");
          const dataUrl = await captureScreenshot();

          if (dataUrl) {
            console.log("[Publish] Screenshot captured, preparing upload...");
            // Convert dataUrl to Blob
            const response = await fetch(dataUrl);
            const blob = await response.blob();
            console.log(`[Publish] Blob created: ${blob.size} bytes, type: ${blob.type}`);

            try {
              console.log("[Publish] Attempting S3 upload negotiation...");
              // 1. Get presigned URL
              const uploadRes = await apiFetch<any>("/api/v1/uploads", {
                method: "POST",
                json: {
                  type: "post_cover",
                  contentType: "image/png"
                }
              });

              const { putUrl, uploadId } = uploadRes.data.upload;
              console.log(`[Publish] S3 Presigned URL obtained, id: ${uploadId}`);

              // 2. Upload directly to S3
              console.log("[Publish] Sending PUT request to S3...");
              const s3Res = await fetch(putUrl, {
                method: "PUT",
                body: blob,
                headers: {
                  "Content-Type": "image/png",
                }
              });

              if (!s3Res.ok) {
                throw new Error(`S3 upload failed with status ${s3Res.status}`);
              }

              coverUploadId = uploadId;
              console.log("✅ [Publish] Screenshot uploaded to S3 successfully:", coverUploadId);
            } catch (s3Err) {
              console.error("❌ [Publish] S3 upload failed:", s3Err);
              throw s3Err; // Re-throw to prevent fallback
            }
          } else {
            console.warn("[Publish] Capture returned empty dataUrl");
          }
        } catch (captureErr) {
          console.error("❌ [Publish] Final screenshot upload failure:", captureErr);
          // Don't block publishing if only screenshot fails
        }
      }

      // 1) Create snapshot
      console.log(`[Publish] Creating snapshot for project ${projectId} with coverUploadId: ${coverUploadId}`);
      const snapRes = await apiFetch<CreateSnapshotResponse>(
        `/api/v1/projects/${projectId}/snapshots`,
        {
          method: "POST",
          json: {
            jobId: latestJobId,
            config: currentConfig,
            coverUploadId: coverUploadId,
          },
        }
      );
      console.log(`[Publish] Snapshot created: ${snapRes.data.snapshot.id}, coverUrl: ${snapRes.data.snapshot.coverUrl}`);

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
      <DialogContent
        className="max-w-2xl border border-white/10 bg-black/80 text-white shadow-2xl backdrop-blur-md"
        onPointerDown={(e) => e.stopPropagation()}
        onPointerMove={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle className="text-white">Publish to community</DialogTitle>
          <DialogDescription className="text-white/60">
            Share your visualization with the world. Give it a title and description.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-white/90">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your visualization a title"
              className="w-full rounded-none border border-white/15 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-white/40 focus:ring-2 focus:ring-cyan-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-white/90">Repository</label>
            <input
              value={repoUrl}
              readOnly
              className="w-full rounded-none border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60 outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-white/90">Description</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Describe your project..."
              className="w-full min-h-[140px] rounded-none border border-white/15 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-white/40 focus:ring-2 focus:ring-cyan-400 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-none border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/70 hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              onClick={onPublish}
              disabled={loading || !title.trim()}
              className="rounded-none bg-cyan-300/90 px-4 py-2 text-sm font-medium text-black hover:bg-cyan-200 disabled:bg-white/10 disabled:text-white/40"
            >
              {loading ? "Publishing..." : "Publish"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
