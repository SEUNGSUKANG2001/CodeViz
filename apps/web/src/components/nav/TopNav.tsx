"use client";

import Link from "next/link";

type Props = {
  isAuthed?: boolean;
};

export function TopNav({ isAuthed }: Props) {
  return (
    <header className="relative z-20 w-full px-10 py-7">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="relative h-9 w-9 rounded-2xl border border-neutral-300 bg-white">
            <div className="absolute left-2 top-2 h-2 w-2 rounded-full bg-indigo-600" />
          </div>
          <span className="text-sm font-semibold tracking-[0.18em] text-neutral-900">
            CODEVIZ
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/feed"
            className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm hover:bg-neutral-50"
          >
            Explore
          </Link>
          {isAuthed ? (
            <Link
              href="/me"
              className="rounded-full bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800"
            >
              My Page
            </Link>
          ) : (
            <button
              onClick={() => {
                window.location.href = "/api/v1/auth/kakao/start";
              }}
              className="rounded-full bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800"
            >
              Login
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
