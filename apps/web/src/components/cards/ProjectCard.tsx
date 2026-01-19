import type { ProjectCard as ProjectCardT } from "@/lib/types";

type Props = {
  item: ProjectCardT;
};

export function ProjectCard({ item }: Props) {
  const statusStyles = {
    ready: "bg-indigo-50 text-indigo-700 border-indigo-200",
    error: "bg-red-50 text-red-700 border-red-200",
    draft: "bg-neutral-100 text-neutral-600 border-neutral-200",
  };

  return (
    <div className="group block">
      <div className="overflow-hidden rounded-2xl bg-neutral-100">
        <div className="aspect-[4/3] w-full">
          {item.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.coverUrl}
              alt={item.title}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div
              className="h-full w-full transition duration-500 group-hover:scale-[1.03]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 35% 40%, rgba(79,70,229,0.16), transparent 50%), radial-gradient(circle at 70% 65%, rgba(0,0,0,0.10), transparent 52%), linear-gradient(135deg, rgba(255,255,255,0.86), rgba(255,255,255,0))",
              }}
            />
          )}
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-neutral-900">
            {item.title}
          </h3>
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${
              statusStyles[item.status as keyof typeof statusStyles] ?? statusStyles.draft
            }`}
          >
            {item.status}
          </span>
        </div>

        <div className="mt-2 text-xs text-neutral-500">
          {new Date(item.updatedAt).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
