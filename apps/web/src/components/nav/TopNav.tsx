"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

type Props = {
  isAuthed?: boolean;
};

export function TopNav({ isAuthed }: Props) {
  return (
    <header className="sticky top-0 z-20 glass border-b border-white/10">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="font-semibold tracking-tight">
          CODEVIZ
        </Link>

        <div className="flex items-center gap-2">
          {isAuthed ? (
            <Button asChild variant="secondary" size="sm">
              <Link href="/me">My Page</Link>
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => {
                window.location.href = "/api/v1/auth/kakao/start";
              }}
            >
              Kakao Login
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
