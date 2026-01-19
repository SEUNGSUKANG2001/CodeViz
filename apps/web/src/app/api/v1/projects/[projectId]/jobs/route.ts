import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { enqueueJob } from '@/lib/queue';
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

export async function POST(request: NextRequest, { params }: Params) {
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

  let body: { ref?: string | null; options?: Record<string, unknown> | null } = {};
  try {
    const text = await request.text();
    if (text) {
      body = JSON.parse(text);
    }
  } catch {
    // No body is fine
  }

  if (body.ref !== undefined) {
    await prisma.project.update({
      where: { id: projectId },
      data: { ref: body.ref },
    });
  }

  const job = await prisma.analysisJob.create({
    data: {
      projectId,
      status: 'queued',
    },
  });

  await enqueueJob(job.id);

  return successResponse({
    job: formatJob(job),
  });
}
