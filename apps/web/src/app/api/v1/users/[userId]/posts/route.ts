import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import {
  ERR_NOT_FOUND,
  successResponse,
} from '@/lib/errors';
import {
  formatPostCard,
  parseCursor,
  encodeCursor,
} from '@/lib/helpers';

interface Params {
  params: Promise<{ userId: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  const { userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return ERR_NOT_FOUND();
  }

  const searchParams = request.nextUrl.searchParams;
  const limit = Math.min(parseInt(searchParams.get('limit') || '24', 10), 100);
  const cursor = searchParams.get('cursor');

  const cursorData = parseCursor(cursor);

  const whereClause: Record<string, unknown> = {
    authorId: userId,
    visibility: 'public',
  };

  if (cursorData) {
    whereClause.OR = [
      { createdAt: { lt: cursorData.createdAt } },
      {
        createdAt: cursorData.createdAt,
        id: { lt: cursorData.id },
      },
    ];
  }

  const posts = await prisma.post.findMany({
    where: whereClause,
    include: {
      author: true,
      snapshot: true,
      _count: {
        select: {
          likes: true,
          comments: true,
        },
      },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
  });

  const hasMore = posts.length > limit;
  const items = hasMore ? posts.slice(0, limit) : posts;

  const nextCursor =
    hasMore && items.length > 0
      ? encodeCursor(items[items.length - 1].id, items[items.length - 1].createdAt)
      : null;

  const formattedItems = items.map((post) => {
    return formatPostCard(post, post.snapshot.coverUrl);
  });

  return successResponse({
    items: formattedItems,
    nextCursor,
  });
}
