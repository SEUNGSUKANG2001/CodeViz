import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import {
  ERR_NOT_FOUND,
  successResponse,
} from '@/lib/errors';
import { formatUserProfile } from '@/lib/helpers';

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

  const [postCount, followerCount, followingCount] = await Promise.all([
    prisma.post.count({
      where: {
        authorId: userId,
        visibility: 'public',
      },
    }),
    prisma.userFollow.count({
      where: { followingId: userId },
    }),
    prisma.userFollow.count({
      where: { followerId: userId },
    }),
  ]);

  return successResponse({
    user: formatUserProfile(user),
    stats: {
      posts: postCount,
      followers: followerCount,
      following: followingCount,
    },
  });
}
