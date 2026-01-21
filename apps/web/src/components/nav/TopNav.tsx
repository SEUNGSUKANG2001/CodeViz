"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type Props = {
  isAuthed?: boolean;
};

export function TopNav({ isAuthed }: Props) {
  const router = useRouter();
  return (
    <header className="relative z-20 w-full px-10 py-7">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="relative h-9 w-9 rounded-none border border-white/20 bg-white/10 backdrop-blur-md">
            <div className="absolute left-2 top-2 h-2 w-2 rounded-full bg-indigo-500" />
          </div>
          <span className="text-sm font-semibold tracking-[0.18em] text-white">
            CODEVIZ
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/feed"
            className="rounded-full bg-black border border-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            Explore
          </Link>
          {isAuthed ? (
            <Link
              href="/me"
              className="rounded-full bg-white px-4 py-2 text-sm font-bold text-black transition hover:bg-neutral-200"
            >
              My Page
            </Link>
          ) : (
            <button
              onClick={() => router.push("/api/v1/auth/github/start")}
              className="rounded-full bg-white px-4 py-2 text-sm font-bold text-black transition hover:bg-neutral-200"
            >
              Login
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
