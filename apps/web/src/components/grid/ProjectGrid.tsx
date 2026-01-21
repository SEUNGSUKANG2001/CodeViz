"use client";

import type { ProjectCard as ProjectCardT } from "@/lib/types";
import { ProjectCard } from "@/components/cards/ProjectCard";

type Props = {
  items: ProjectCardT[];
};

export function ProjectGrid({ items }: Props) {
  if (!items || items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500">
        No projects yet. Create one to get started!
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((p) => (
        <ProjectCard
          key={p.id}
          project={p}
          onDelete={() => {
            // no-op for grid view
          }}
          onOpen={() => {
            // no-op for grid view
          }}
        />
      ))}
    </div>
  );
}
