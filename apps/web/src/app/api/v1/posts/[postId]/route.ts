import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import {
  ERR_NOT_FOUND,
  successResponse,
  isValidUUID,
} from '@/lib/errors';
import { formatUserSummary } from '@/lib/helpers';

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
    include: {
      author: true,
      snapshot: {
        include: {
          job: true,
          project: true,
        },
      },
      _count: {
        select: {
          likes: true,
          comments: true,
        },
      },
    },
  });

  if (!post) {
    return ERR_NOT_FOUND();
  }

  if (post.visibility === 'private') {
    return ERR_NOT_FOUND();
  }

  return successResponse({
    post: {
      id: post.id,
      visibility: post.visibility,
      title: post.title,
      body: post.body,
      tags: post.tags,
      author: formatUserSummary(post.author),
      snapshot: {
        id: post.snapshot.id,
        coverUrl: post.snapshot.coverUrl,
        config: post.snapshot.config,
        job: post.snapshot.job
          ? {
              id: post.snapshot.job.id,
              status: post.snapshot.job.status,
            }
          : null,
      },
      projectLink: {
        projectId: post.snapshot.projectId,
        viewerUrl: `/project/${post.snapshot.projectId}`,
      },
      counts: {
        likes: post._count.likes,
        comments: post._count.comments,
      },
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    },
  });
}
