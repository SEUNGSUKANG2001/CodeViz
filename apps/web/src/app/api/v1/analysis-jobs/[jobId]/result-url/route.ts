import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { createPresignedGetUrl } from '@/lib/s3';
import { ERR_NOT_FOUND, ERR_FORBIDDEN, successResponse, isValidUUID } from '@/lib/errors';

const PRESIGNED_URL_EXPIRES_IN = 300; // 5 minutes

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  if (!isValidUUID(jobId)) {
    return ERR_NOT_FOUND('Job not found');
  }

  const auth = await getSession();

  // Find the job with project and check for public posts
  const job = await prisma.analysisJob.findUnique({
    where: { id: jobId },
    include: {
      project: {
        select: {
          ownerId: true,
        },
      },
      snapshots: {
        select: {
          posts: {
            where: { visibility: 'public' },
            select: { id: true },
            take: 1,
          },
        },
      },
    },
  });

  if (!job) {
    return ERR_NOT_FOUND('Job not found');
  }

  // Check if job has a result
  if (!job.resultUrl) {
    return ERR_NOT_FOUND('Job result not available');
  }

  // Authorization check:
  // 1. User is the project owner
  // 2. OR there's a public post using a snapshot from this job
  const isOwner = auth?.user.id === job.project.ownerId;
  const hasPublicPost = job.snapshots.some(
    (snapshot) => snapshot.posts.length > 0
  );

  if (!isOwner && !hasPublicPost) {
    return ERR_FORBIDDEN('You do not have access to this result');
  }

  // Generate presigned GET URL
  const url = await createPresignedGetUrl(job.resultUrl, PRESIGNED_URL_EXPIRES_IN);

  return successResponse({
    url,
    expiresIn: PRESIGNED_URL_EXPIRES_IN,
  });
}
