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
                  "x-amz-acl": "public-read"
                }
              });

              if (!s3Res.ok) {
                throw new Error(`S3 upload failed with status ${s3Res.status}`);
              }

              coverUploadId = uploadId;
              console.log("✅ [Publish] Screenshot uploaded to S3 successfully:", coverUploadId);
            } catch (s3Err) {
              console.error("⚠️ [Publish] S3 upload failed, trying local fallback:", s3Err);

              // FALLBACK: Upload to local server
              const formData = new FormData();
              formData.append('file', blob, 'cover.png');
              formData.append('type', 'post_cover');

              console.log("[Publish] Attempting local upload fallback...");
              const localRes = await fetch("/api/v1/uploads/local", {
                method: "POST",
                body: formData,
              });

              if (!localRes.ok) {
                throw new Error(`Local fallback failed with status ${localRes.status}`);
              }

              const localData = await localRes.json();
              coverUploadId = localData.data.upload.uploadId;
              console.log("✅ [Publish] Screenshot uploaded to LOCAL fallback successfully:", coverUploadId);
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
          <DialogDescription className="text-neutral-500">
            Share your visualization with the world. Give it a title and description.
          </DialogDescription>
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
