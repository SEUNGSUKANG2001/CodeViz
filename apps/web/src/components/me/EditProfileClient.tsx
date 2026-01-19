"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { MyProfileResponse, UpdateProfileResponse } from "@/lib/types";
import { TopNav } from "@/components/nav/TopNav";

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
    <main className="relative min-h-screen bg-[#fbfbfc] text-neutral-900">
      {/* Background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(circle at 18% 12%, rgba(79,70,229,0.06), transparent 45%),
            radial-gradient(circle at 80% 18%, rgba(0,0,0,0.06), transparent 46%),
            linear-gradient(180deg, rgba(255,255,255,0.0) 0%, rgba(0,0,0,0.02) 100%)
          `,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.10]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(0,0,0,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.12) 1px, transparent 1px)",
          backgroundSize: "96px 96px",
        }}
      />

      <TopNav isAuthed={isAuthed} />

      <div className="relative z-10 mx-auto max-w-xl px-10 py-12">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <div className="text-[11px] tracking-[0.18em] text-neutral-500">SETTINGS</div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Edit Profile</h1>
          </div>
          <Link
            href="/me"
            className="rounded-full bg-neutral-100 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-200"
          >
            Back
          </Link>
        </div>

        {loading ? (
          <div className="text-sm text-neutral-500">Loading...</div>
        ) : !isAuthed ? (
          <div className="space-y-4">
            <div className="text-sm text-neutral-500">Login required</div>
            <button
              onClick={() =>
                (window.location.href = "/api/v1/auth/kakao/start")
              }
              className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Login
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-full bg-neutral-100 overflow-hidden">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-3xl font-medium text-neutral-400">
                    {displayName?.[0] ?? "U"}
                  </div>
                )}
              </div>
              <div className="text-sm text-neutral-400">
                Avatar upload coming soon
              </div>
            </div>

            {/* Display name */}
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-900">
                Display name
              </label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={80}
                className="w-full rounded-xl bg-neutral-100 px-4 py-3 text-sm outline-none placeholder:text-neutral-400 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-900">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full min-h-[140px] rounded-xl bg-neutral-100 px-4 py-3 text-sm outline-none placeholder:text-neutral-400 focus:ring-2 focus:ring-indigo-500 resize-none"
                maxLength={500}
              />
              <div className="mt-2 text-xs text-neutral-400">
                {bio.length}/500
              </div>
            </div>

            {/* Save */}
            <div className="flex justify-end">
              <button
                onClick={save}
                disabled={saving}
                className="rounded-full bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:bg-neutral-200 disabled:text-neutral-500"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
