import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import {
  ERR_UNAUTHORIZED,
  ERR_BAD_REQUEST,
  successResponse,
} from '@/lib/errors';
import {
  formatPostCard,
  parseCursor,
  encodeCursor,
} from '@/lib/helpers';

export async function POST(request: NextRequest) {
  const auth = await getSession();
  if (!auth) {
    return ERR_UNAUTHORIZED();
  }

  let body: {
    snapshotId?: string;
    title?: string;
    body?: string | null;
    repoUrl?: string | null;
    visibility?: 'public' | 'unlisted' | 'private';
    tags?: string[] | null;
  };
  try {
    body = await request.json();
  } catch {
    return ERR_BAD_REQUEST('Invalid JSON body');
  }

  if (!body.snapshotId) {
    return ERR_BAD_REQUEST('snapshotId is required');
  }

  if (!body.title) {
    return ERR_BAD_REQUEST('title is required');
  }

  const snapshot = await prisma.snapshot.findUnique({
    where: { id: body.snapshotId },
    include: {
      project: true,
    },
  });

  if (!snapshot) {
    return ERR_BAD_REQUEST('Snapshot not found');
  }

  if (snapshot.project.ownerId !== auth.user.id) {
    return ERR_BAD_REQUEST('You do not own this snapshot');
  }

  const post = await prisma.post.create({
    data: {
      snapshotId: body.snapshotId,
      authorId: auth.user.id,
      title: body.title,
      body: body.body || null,
      repoUrl: body.repoUrl || snapshot.project.repoUrl,
      visibility: body.visibility || 'public',
      tags: body.tags || [],
    },
  });

  return successResponse({
    post: {
      id: post.id,
      visibility: post.visibility,
      authorId: post.authorId,
      createdAt: post.createdAt.toISOString(),
    },
  });
}

export async function GET(request: NextRequest) {
  const auth = await getSession();
  if (!auth) {
    return ERR_UNAUTHORIZED();
  }

  const searchParams = request.nextUrl.searchParams;
  const scope = searchParams.get('scope');
  const limit = Math.min(parseInt(searchParams.get('limit') || '24', 10), 100);
  const cursor = searchParams.get('cursor');

  if (scope !== 'mine') {
    return ERR_BAD_REQUEST('scope=mine is required');
  }

  const cursorData = parseCursor(cursor);

  const whereClause: Record<string, unknown> = {
    authorId: auth.user.id,
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
