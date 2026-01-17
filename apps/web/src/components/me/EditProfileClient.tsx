"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { MyProfileResponse, UpdateProfileResponse } from "@/lib/types";
import { TopNav } from "@/components/nav/TopNav";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function EditProfileClient() {
  const [isAuthed, setIsAuthed] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch<MyProfileResponse>("/api/v1/users/me");
        setIsAuthed(true);
        setDisplayName(res.data.user.displayName ?? "");
        setBio(res.data.user.bio ?? "");
        setAvatarUrl(res.data.user.avatarUrl ?? null);
      } catch {
        setIsAuthed(false);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function save() {
    setSaving(true);
    try {
      const res = await apiFetch<UpdateProfileResponse>("/api/v1/users/me", {
        method: "PATCH",
        json: { displayName, bio },
      });
      setDisplayName(res.data.user.displayName ?? "");
      setBio(res.data.user.bio ?? "");
      alert("Saved!");
    } catch (e: unknown) {
      const error = e as Error;
      alert(error?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen">
      <TopNav isAuthed={isAuthed} />
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Edit Profile</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Update your name and bio.
            </p>
          </div>
          <Button asChild variant="secondary">
            <Link href="/me">Back to My Page</Link>
          </Button>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : !isAuthed ? (
          <Card>
            <CardContent className="space-y-3 p-4">
              <div className="text-sm text-muted-foreground">Login required</div>
              <Button
                onClick={() =>
                  (window.location.href = "/api/v1/auth/kakao/start")
                }
              >
                Kakao Login
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={avatarUrl ?? undefined} />
                  <AvatarFallback>{displayName?.[0] ?? "U"}</AvatarFallback>
                </Avatar>
                <div className="text-sm text-muted-foreground">
                  Avatar upload coming soon
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Display name
                </label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={80}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Bio</label>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="min-h-[120px]"
                  maxLength={500}
                />
                <div className="mt-1 text-xs text-muted-foreground">
                  {bio.length}/500
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={save} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
