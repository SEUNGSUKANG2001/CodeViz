"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { UserProfileResponse, ToggleFollowResponse } from "@/lib/types";
import { TopNav } from "@/components/nav/TopNav";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
      // Update follower count
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
    <main className="min-h-screen">
      <TopNav />
      <div className="mx-auto max-w-6xl px-4 py-8">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : profile ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={profile.user.avatarUrl ?? undefined} />
                    <AvatarFallback>
                      {profile.user.displayName?.[0] ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-lg font-semibold">
                      {profile.user.displayName ?? "User"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      @{profile.user.username ?? "user"}
                    </div>
                  </div>
                </div>

                {profile.user.bio && (
                  <div className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground">
                    {profile.user.bio}
                  </div>
                )}

                <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
                  <span>
                    <strong className="text-foreground">{profile.stats.posts}</strong>{" "}
                    posts
                  </span>
                  <span>
                    <strong className="text-foreground">{profile.stats.followers}</strong>{" "}
                    followers
                  </span>
                  <span>
                    <strong className="text-foreground">{profile.stats.following}</strong>{" "}
                    following
                  </span>
                </div>

                <div className="mt-5 flex gap-2">
                  <Button onClick={follow} className="flex-1">
                    Follow
                  </Button>
                  <Button asChild variant="secondary" className="flex-1">
                    <Link href="/">Explore</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <section className="space-y-3">
              <div className="flex items-end justify-between">
                <h2 className="text-lg font-semibold">Posts</h2>
                <span className="text-sm text-muted-foreground">Public</span>
              </div>
              <PostGridFromUser userId={userId} />
            </section>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">User not found</div>
        )}
      </div>
    </main>
  );
}
