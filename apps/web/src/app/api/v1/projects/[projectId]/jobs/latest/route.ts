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
import { formatJob } from '@/lib/helpers';

interface Params {
  params: Promise<{ projectId: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await getSession();
  if (!auth) {
    return ERR_UNAUTHORIZED();
  }

  const { projectId } = await params;

  if (!isValidUUID(projectId)) {
    return ERR_NOT_FOUND('Project not found');
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    return ERR_NOT_FOUND();
  }

  if (project.ownerId !== auth.user.id) {
    return ERR_FORBIDDEN();
  }

  const job = await prisma.analysisJob.findFirst({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  });

  if (!job) {
    return ERR_NOT_FOUND('No jobs found for this project');
  }

  return successResponse({
    job: formatJob(job),
  });
}
