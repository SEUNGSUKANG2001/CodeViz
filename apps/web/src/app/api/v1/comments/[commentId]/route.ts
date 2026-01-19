import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import {
  ERR_UNAUTHORIZED,
  ERR_FORBIDDEN,
  ERR_NOT_FOUND,
  successResponse,
  isValidUUID,
} from '@/lib/errors';

interface Params {
  params: Promise<{ commentId: string }>;
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await getSession();
  if (!auth) {
    return ERR_UNAUTHORIZED();
  }

  const { commentId } = await params;

  if (!isValidUUID(commentId)) {
    return ERR_NOT_FOUND('Comment not found');
  }

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
  });

  if (!comment) {
    return ERR_NOT_FOUND();
  }

  if (comment.authorId !== auth.user.id) {
    return ERR_FORBIDDEN();
  }

  await prisma.comment.update({
    where: { id: commentId },
    data: {
      isDeleted: true,
      body: '[deleted]',
    },
  });

  return successResponse({});
}
