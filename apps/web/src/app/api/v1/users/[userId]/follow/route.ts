import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import {
  ERR_UNAUTHORIZED,
  ERR_NOT_FOUND,
  ERR_BAD_REQUEST,
  successResponse,
} from '@/lib/errors';

interface Params {
  params: Promise<{ userId: string }>;
}

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await getSession();
  if (!auth) {
    return ERR_UNAUTHORIZED();
  }

  const { userId } = await params;

  if (userId === auth.user.id) {
    return ERR_BAD_REQUEST('You cannot follow yourself');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return ERR_NOT_FOUND();
  }

  const existingFollow = await prisma.userFollow.findUnique({
    where: {
      followerId_followingId: {
        followerId: auth.user.id,
        followingId: userId,
      },
    },
  });

  let following: boolean;

  if (existingFollow) {
    await prisma.userFollow.delete({
      where: { id: existingFollow.id },
    });
    following = false;
  } else {
    await prisma.userFollow.create({
      data: {
        followerId: auth.user.id,
        followingId: userId,
      },
    });
    following = true;
  }

  const followerCount = await prisma.userFollow.count({
    where: { followingId: userId },
  });

  return successResponse({
    following,
    followerCount,
  });
}
