import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import {
  ERR_UNAUTHORIZED,
  ERR_NOT_FOUND,
  ERR_BAD_REQUEST,
  successResponse,
  isValidUUID,
} from '@/lib/errors';
import {
  formatComment,
  parseCursor,
  encodeCursor,
} from '@/lib/helpers';

interface Params {
  params: Promise<{ postId: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  const { postId } = await params;

  if (!isValidUUID(postId)) {
    return ERR_NOT_FOUND('Post not found');
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
  });

  if (!post) {
    return ERR_NOT_FOUND();
  }

  const searchParams = request.nextUrl.searchParams;
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
  const cursor = searchParams.get('cursor');

  const cursorData = parseCursor(cursor);

  const whereClause: Record<string, unknown> = {
    postId,
    isDeleted: false,
  };

  if (cursorData) {
    whereClause.OR = [
      { createdAt: { gt: cursorData.createdAt } },
      {
        createdAt: cursorData.createdAt,
        id: { gt: cursorData.id },
      },
    ];
  }

  const comments = await prisma.comment.findMany({
    where: whereClause,
    include: {
      author: true,
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    take: limit + 1,
  });

  const hasMore = comments.length > limit;
  const items = hasMore ? comments.slice(0, limit) : comments;

  const nextCursor =
    hasMore && items.length > 0
      ? encodeCursor(items[items.length - 1].id, items[items.length - 1].createdAt)
      : null;

  return successResponse({
    items: items.map(formatComment),
    nextCursor,
  });
}

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await getSession();
  if (!auth) {
    return ERR_UNAUTHORIZED();
  }

  const { postId } = await params;

  if (!isValidUUID(postId)) {
    return ERR_NOT_FOUND('Post not found');
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
  });

  if (!post) {
    return ERR_NOT_FOUND();
  }

  let body: { body?: string; parentId?: string | null };
  try {
    body = await request.json();
  } catch {
    return ERR_BAD_REQUEST('Invalid JSON body');
  }

  if (!body.body || typeof body.body !== 'string' || body.body.length === 0) {
    return ERR_BAD_REQUEST('body is required');
  }

  if (body.body.length > 5000) {
    return ERR_BAD_REQUEST('body must be less than 5000 characters');
  }

  if (body.parentId) {
    const parentComment = await prisma.comment.findUnique({
      where: { id: body.parentId },
    });

    if (!parentComment || parentComment.postId !== postId) {
      return ERR_BAD_REQUEST('Invalid parentId');
    }
  }

  const comment = await prisma.comment.create({
    data: {
      postId,
      authorId: auth.user.id,
      body: body.body,
      parentId: body.parentId || null,
    },
    include: {
      author: true,
    },
  });

  return successResponse({
    comment: formatComment(comment),
  });
}
