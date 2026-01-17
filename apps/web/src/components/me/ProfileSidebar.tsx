"use client";

import Link from "next/link";
import type { MeResponse } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

type Props = {
  me: MeResponse | null;
};

export function ProfileSidebar({ me }: Props) {
  if (!me) {
    return (
      <aside className="space-y-4">
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            Loading...
          </CardContent>
        </Card>
      </aside>
    );
  }

  if (me.ok === false) {
    return (
      <aside className="space-y-4">
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="text-sm text-muted-foreground">Login required</div>
            <Button
              onClick={() => (window.location.href = "/api/v1/auth/kakao/start")}
              className="w-full"
            >
              Kakao Login
            </Button>
          </CardContent>
        </Card>
      </aside>
    );
  }

  const u = me.data.user;

  return (
    <aside className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <Link href="/me/edit" className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={u.avatarUrl ?? undefined} />
              <AvatarFallback>{u.displayName?.[0] ?? "U"}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium leading-tight">
                {u.displayName ?? "User"}
              </div>
              <div className="text-xs text-muted-foreground">
                @{u.username ?? "user"}
              </div>
            </div>
          </Link>

          <div className="mt-4 text-sm text-muted-foreground">
            Click profile to edit.
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}
