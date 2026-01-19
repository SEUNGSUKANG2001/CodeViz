"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { UserProfileResponse, ToggleFollowResponse } from "@/lib/types";
import { TopNav } from "@/components/nav/TopNav";
import { PostGridFromUser } from "@/components/users/PostGridFromUser";

type Props = {
  userId: string;
};

export function UserProfileClient({ userId }: Props) {
  const [profile, setProfile] = useState<UserProfileResponse["data"] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch<UserProfileResponse>(`/api/v1/users/${userId}`);
        setProfile(res.data);
      } catch (e: unknown) {
        const error = e as Error;
        console.error(error?.message ?? "User not found");
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  async function follow() {
    try {
      const res = await apiFetch<ToggleFollowResponse>(
        `/api/v1/users/${userId}/follow`,
        { method: "POST" }
      );
      alert(res.data.following ? "Followed!" : "Unfollowed");
      if (profile) {
        setProfile({
          ...profile,
          stats: {
            ...profile.stats,
            followers: res.data.followerCount,
          },
        });
      }
    } catch (e: unknown) {
      const error = e as Error;
      alert(error?.message ?? "Follow failed (login required?)");
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

      <TopNav />

      <div className="relative z-10 mx-auto max-w-[1600px] px-10 py-8">
        {loading ? (
          <div className="text-sm text-neutral-500">Loading...</div>
        ) : profile ? (
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[280px_1fr]">
            {/* Profile */}
            <div>
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-full bg-neutral-100 overflow-hidden">
                  {profile.user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.user.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-3xl font-medium text-neutral-400">
                      {profile.user.displayName?.[0] ?? "U"}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-xl font-semibold text-neutral-900">
                    {profile.user.displayName ?? "User"}
                  </div>
                  <div className="text-sm text-neutral-500">
                    @{profile.user.username ?? "user"}
                  </div>
                </div>
              </div>

              {profile.user.bio && (
                <div className="mt-5 whitespace-pre-wrap text-sm text-neutral-600 leading-relaxed">
                  {profile.user.bio}
                </div>
              )}

              <div className="mt-5 flex gap-6 text-sm text-neutral-500">
                <span>
                  <strong className="text-neutral-900">{profile.stats.posts}</strong> posts
                </span>
                <span>
                  <strong className="text-neutral-900">{profile.stats.followers}</strong> followers
                </span>
                <span>
                  <strong className="text-neutral-900">{profile.stats.following}</strong> following
                </span>
              </div>

              <div className="mt-6 flex gap-2">
                <button
                  onClick={follow}
                  className="flex-1 rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                >
                  Follow
                </button>
                <Link
                  href="/feed"
                  className="flex-1 rounded-full bg-neutral-100 px-4 py-2 text-center text-sm text-neutral-700 hover:bg-neutral-200"
                >
                  Explore
                </Link>
              </div>
            </div>

            {/* Posts */}
            <section className="space-y-6">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-[11px] tracking-[0.18em] text-neutral-400">GALLERY</div>
                  <h2 className="mt-1 text-xl font-semibold">Posts</h2>
                </div>
                <span className="text-sm text-neutral-400">Public</span>
              </div>
              <PostGridFromUser userId={userId} />
            </section>
          </div>
        ) : (
          <div className="text-sm text-neutral-500">User not found</div>
        )}
      </div>
    </main>
  );
}
