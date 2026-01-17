import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import {
  ERR_UNAUTHORIZED,
  ERR_FORBIDDEN,
  ERR_NOT_FOUND,
  ERR_BAD_REQUEST,
  successResponse,
} from '@/lib/errors';
import { formatProjectDetail } from '@/lib/helpers';

interface Params {
  params: Promise<{ projectId: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await getSession();
  if (!auth) {
    return ERR_UNAUTHORIZED();
  }

  const { projectId } = await params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      jobs: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!project) {
    return ERR_NOT_FOUND();
  }

  if (project.ownerId !== auth.user.id) {
    return ERR_FORBIDDEN();
  }

  return successResponse({
    project: formatProjectDetail(project),
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
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

  let body: { title?: string | null; currentConfig?: Record<string, unknown> | null };
  try {
    body = await request.json();
  } catch {
    return ERR_BAD_REQUEST('Invalid JSON body');
  }

  const updateData: Record<string, unknown> = {};

  if (body.title !== undefined && body.title !== null) {
    updateData.title = body.title;
  }

  if (body.currentConfig !== undefined && body.currentConfig !== null) {
    updateData.currentConfig = body.currentConfig;
  }

  const updatedProject = await prisma.project.update({
    where: { id: projectId },
    data: updateData,
    include: {
      jobs: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  return successResponse({
    project: formatProjectDetail(updatedProject),
  });
}

export async function DELETE(request: NextRequest, { params }: Params) {
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

  await prisma.project.delete({
    where: { id: projectId },
  });

  return successResponse({
    deleted: true,
  });
}
