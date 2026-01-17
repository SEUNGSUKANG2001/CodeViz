import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ProjectCard as ProjectCardT } from "@/lib/types";

type Props = {
  item: ProjectCardT;
};

export function ProjectCard({ item }: Props) {
  return (
    <Card className="overflow-hidden transition hover:shadow-md">
      <div className="aspect-[16/10] w-full bg-muted">
        {item.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.coverUrl}
            alt={item.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-4xl">
            🏗️
          </div>
        )}
      </div>

      <CardContent className="space-y-2 p-4">
        <div className="line-clamp-1 font-medium">{item.title}</div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <Badge
            variant={
              item.status === "ready"
                ? "default"
                : item.status === "error"
                ? "destructive"
                : "secondary"
            }
          >
            {item.status}
          </Badge>
          <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
        </div>
      </CardContent>
    </Card>
  );
}
