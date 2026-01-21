import { useState } from "react";
import type { ThemeType } from "@/components/viewer/useCodeCityViewer";

type Props = {
  jobId?: string | null;
  jobStatus?: string | null;
  coverUrl?: string | null;
  title: string;
  theme?: ThemeType;
  className?: string;
};

export function GraphThumbnail({
  coverUrl,
  title,
  className,
}: Props) {
  const [error, setError] = useState(false);

  return (
    <div className={className}>
      <div className="relative h-full w-full overflow-hidden">
        {coverUrl && !error ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt={title}
            onError={() => {
              console.error(`[GraphThumbnail] Failed to load image: ${coverUrl}`);
              setError(true);
            }}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div
            className="h-full w-full bg-neutral-900 flex items-center justify-center border border-white/5"
            style={{
              backgroundImage:
                "radial-gradient(circle at 35% 40%, rgba(79,70,229,0.16), transparent 50%), radial-gradient(circle at 70% 65%, rgba(0,0,0,0.10), transparent 52%), linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0))",
            }}
          >
            <div className="flex flex-col items-center gap-2 opacity-20">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-[10px] font-medium tracking-widest uppercase">No Preview</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

