"use client";

import Link from "next/link";
import type { MeResponse } from "@/lib/types";

type Props = {
  me: MeResponse | null;
};

export function ProfileSidebar({ me }: Props) {
  if (!me) {
    return (
      <aside>
        <div className="text-sm text-neutral-500">Loading...</div>
      </aside>
    );
  }

  if (me.ok === false) {
    return (
      <aside className="space-y-4">
        <div className="text-sm text-neutral-500">Login required</div>
        <button
          onClick={() => (window.location.href = "/api/v1/auth/kakao/start")}
          className="w-full rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Login
        </button>
      </aside>
    );
  }

  const u = me.data.user;

  return (
    <aside>
      <Link href="/me/edit" className="flex items-center gap-3">
        <div className="h-14 w-14 rounded-full bg-neutral-100 overflow-hidden">
          {u.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={u.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xl font-medium text-neutral-400">
              {u.displayName?.[0] ?? "U"}
            </div>
          )}
        </div>
        <div>
          <div className="font-semibold text-neutral-900">
            {u.displayName ?? "User"}
          </div>
          <div className="text-sm text-neutral-500">
            @{u.username ?? "user"}
          </div>
        </div>
      </Link>

      <div className="mt-4 text-sm text-neutral-400">
        Click profile to edit
      </div>
    </aside>
  );
}
