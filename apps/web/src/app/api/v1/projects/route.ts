import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { enqueueJob } from '@/lib/queue';
import {
  ERR_UNAUTHORIZED,
  ERR_BAD_REQUEST,
  successResponse,
} from '@/lib/errors';
import {
  formatJob,
  formatProjectCard,
  extractTitleFromRepoUrl,
  parseCursor,
  encodeCursor,
} from '@/lib/helpers';

export async function POST(request: NextRequest) {
  const auth = await getSession();
  if (!auth) {
    return ERR_UNAUTHORIZED();
  }

  let body: { repoUrl?: string; ref?: string | null };
  try {
    body = await request.json();
  } catch {
    return ERR_BAD_REQUEST('Invalid JSON body');
  }

  const { repoUrl, ref } = body;

  if (!repoUrl || typeof repoUrl !== 'string') {
    return ERR_BAD_REQUEST('repoUrl is required');
  }

  const title = extractTitleFromRepoUrl(repoUrl);

  const project = await prisma.project.create({
    data: {
      ownerId: auth.user.id,
      repoUrl,
      ref: ref || null,
      title,
      status: 'draft',
      currentConfig: {},
    },
  });

  const job = await prisma.analysisJob.create({
    data: {
      projectId: project.id,
      status: 'queued',
    },
  });

  await enqueueJob(job.id);

  return successResponse({
    project: {
      id: project.id,
      repoUrl: project.repoUrl,
      ref: project.ref,
      title: project.title,
      status: project.status,
      latestJob: formatJob(job),
    },
  });
}

export async function GET(request: NextRequest) {
  const auth = await getSession();
  if (!auth) {
    return ERR_UNAUTHORIZED();
  }

  const searchParams = request.nextUrl.searchParams;
  const scope = searchParams.get('scope');
  const status = searchParams.get('status');
  const limit = Math.min(parseInt(searchParams.get('limit') || '24', 10), 100);
  const cursor = searchParams.get('cursor');

  if (scope !== 'mine') {
    return ERR_BAD_REQUEST('scope=mine is required');
  }

  const cursorData = parseCursor(cursor);

  const whereClause: Record<string, unknown> = {
    ownerId: auth.user.id,
  };

  if (status) {
    whereClause.status = status;
  }

  if (cursorData) {
    whereClause.OR = [
      { updatedAt: { lt: cursorData.createdAt } },
      {
        updatedAt: cursorData.createdAt,
        id: { lt: cursorData.id },
      },
    ];
  }

  const projects = await prisma.project.findMany({
    where: whereClause,
    include: {
      jobs: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
  });

  const hasMore = projects.length > limit;
  const items = hasMore ? projects.slice(0, limit) : projects;

  const nextCursor =
    hasMore && items.length > 0
      ? encodeCursor(items[items.length - 1].id, items[items.length - 1].updatedAt)
      : null;

  return successResponse({
    items: items.map(formatProjectCard),
    nextCursor,
  });
}
