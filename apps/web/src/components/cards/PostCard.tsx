import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { PostCard as PostCardT } from "@/lib/types";

export function PostCard({ item }: { item: PostCardT }) {
  return (
    <Card className="overflow-hidden transition hover:shadow-md">
      <div className="aspect-[16/10] w-full bg-muted">
        {item.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.coverUrl} alt={item.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-4xl">
            🏙️
          </div>
        )}
      </div>

      <CardContent className="space-y-3 p-4">
        <div className="line-clamp-1 font-medium">{item.title}</div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Avatar className="h-6 w-6">
            <AvatarImage src={item.author.avatarUrl ?? undefined} />
            <AvatarFallback>{item.author.displayName?.[0] ?? "U"}</AvatarFallback>
          </Avatar>
          <span className="line-clamp-1">{item.author.displayName ?? "User"}</span>
          <span className="ml-auto whitespace-nowrap">
            👍 {item.likeCount} · 💬 {item.commentCount}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
