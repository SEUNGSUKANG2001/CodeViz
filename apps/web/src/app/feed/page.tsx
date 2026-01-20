"use client";

import { useEffect, useState } from "react";
import { TopNav } from "@/components/nav/TopNav";
import { PostGrid } from "@/components/grid/PostGrid";
import { apiFetch } from "@/lib/api";
import { MeResponse } from "@/lib/types";

export default function FeedPage() {
    const [isAuthed, setIsAuthed] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const res = await apiFetch<MeResponse>("/api/v1/auth/me");
                setIsAuthed(res.ok);
            } catch {
                setIsAuthed(false);
            }
        })();
    }, []);

    return (
        <main className="relative min-h-screen bg-[#050505] text-white">
            {/* Background decoration */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 overflow-hidden"
            >
                <div
                    className="absolute -top-[10%] -left-[10%] h-[60%] w-[60%] rounded-full opacity-[0.1] blur-[120px]"
                    style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.8), transparent 70%)' }}
                />
            </div>

            <TopNav isAuthed={isAuthed} />

            <div className="relative z-10 mx-auto max-w-[1600px] px-10 py-12">
                <header className="mb-12">
                    <div className="text-[11px] font-medium tracking-[0.2em] text-neutral-500 uppercase">DISCOVER</div>
                    <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">Explore Projects</h1>
                    <p className="mt-4 text-neutral-400 max-w-2xl">
                        Browse through the community's repository visualizations.
                        Discover how complex architectures are mapped into 3D structures.
                    </p>
                </header>

                <PostGrid />
            </div>
        </main>
    );
}
