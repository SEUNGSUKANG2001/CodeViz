import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import {
  ERR_UNAUTHORIZED,
  ERR_FORBIDDEN,
  ERR_NOT_FOUND,
  ERR_BAD_REQUEST,
  successResponse,
} from '@/lib/errors';
import { formatSnapshot } from '@/lib/helpers';

interface Params {
  params: Promise<{ projectId: string }>;
}

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await getSession();
  if (!auth) {
    return ERR_UNAUTHORIZED();
  }

  const { projectId } = await params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    return ERR_NOT_FOUND();
  }

  if (project.ownerId !== auth.user.id) {
    return ERR_FORBIDDEN();
  }

  let body: {
    jobId?: string | null;
    config?: Record<string, unknown>;
    coverUploadId?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return ERR_BAD_REQUEST('Invalid JSON body');
  }

  if (!body.config || typeof body.config !== 'object') {
    return ERR_BAD_REQUEST('config is required');
  }

  let coverUrl: string | null = null;

  if (body.coverUploadId) {
    const upload = await prisma.upload.findUnique({
      where: { id: body.coverUploadId },
    });

    if (upload && upload.createdBy === auth.user.id) {
      coverUrl = upload.publicUrl;
    }
  }

  const snapshot = await prisma.snapshot.create({
    data: {
      projectId,
      jobId: body.jobId || null,
      config: body.config as Prisma.InputJsonValue,
      coverUrl,
    },
    include: {
      job: true,
    },
  });

  return successResponse({
    snapshot: formatSnapshot(snapshot),
  });
}
