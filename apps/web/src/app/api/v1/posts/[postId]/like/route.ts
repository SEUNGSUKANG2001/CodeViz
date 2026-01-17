import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import {
  ERR_UNAUTHORIZED,
  ERR_NOT_FOUND,
  successResponse,
} from '@/lib/errors';

interface Params {
  params: Promise<{ postId: string }>;
}

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await getSession();
  if (!auth) {
    return ERR_UNAUTHORIZED();
  }

  const { postId } = await params;

  const post = await prisma.post.findUnique({
    where: { id: postId },
  });

  if (!post) {
    return ERR_NOT_FOUND();
  }

  const existingLike = await prisma.postLike.findUnique({
    where: {
      postId_userId: {
        postId,
        userId: auth.user.id,
      },
    },
  });

  let liked: boolean;

  if (existingLike) {
    await prisma.postLike.delete({
      where: { id: existingLike.id },
    });
    liked = false;
  } else {
    await prisma.postLike.create({
      data: {
        postId,
        userId: auth.user.id,
      },
    });
    liked = true;
  }

  const likeCount = await prisma.postLike.count({
    where: { postId },
  });

  return successResponse({
    liked,
    likeCount,
  });
}
