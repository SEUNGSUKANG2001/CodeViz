import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getSession } from '@/lib/auth';
import { ERR_BAD_REQUEST, ERR_UNAUTHORIZED, successResponse } from '@/lib/errors';

export async function GET() {
  const auth = await getSession();
  if (!auth) {
    return ERR_UNAUTHORIZED();
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: {
      defaultPlanetId: true,
      planets: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          seed: true,
          params: true,
          palette: true,
          cloudColor: true,
          projectId: true,
          city: {
            select: {
              cityJsonKey: true,
            },
          },
        },
      },
    },
  });

  return successResponse({
    defaultPlanetId: user?.defaultPlanetId ?? null,
    items: user?.planets ?? [],
  });
}

export async function POST(request: NextRequest) {
  const auth = await getSession();
  if (!auth) {
    return ERR_UNAUTHORIZED();
  }

  let body: {
    planetId?: string;
    planet?: {
      seed: number;
      params: Record<string, unknown>;
      palette: Record<string, unknown>;
      cloudColor: Record<string, unknown>;
    };
    projectId?: string;
    cityAnchor?: {
      point: [number, number, number];
      normal: [number, number, number];
    };
  };
  try {
    body = await request.json();
  } catch {
    return ERR_BAD_REQUEST('Invalid JSON body');
  }

  if (body.planet) {
    const { planet, projectId } = body;
    if (!planet || typeof planet.seed !== 'number') {
      return ERR_BAD_REQUEST('Invalid planet payload');
    }

    let project = null;
    if (projectId) {
      project = await prisma.project.findFirst({
        where: { id: projectId, ownerId: auth.user.id },
        select: { id: true },
      });
      if (!project) {
        return ERR_BAD_REQUEST('Project not found');
      }
    }

    const params = {
      ...(planet.params ?? {}),
      ...(body.cityAnchor ? { cityAnchor: body.cityAnchor } : {}),
    };

    const created = await prisma.planet.create({
      data: {
        ownerId: auth.user.id,
        projectId: project?.id ?? null,
        seed: planet.seed,
        params: params as Prisma.InputJsonValue,
        palette: (planet.palette ?? {}) as Prisma.InputJsonValue,
        cloudColor: (planet.cloudColor ?? {}) as Prisma.InputJsonValue,
      },
      select: { id: true },
    });

    await prisma.user.update({
      where: { id: auth.user.id },
      data: { defaultPlanetId: created.id },
    });

    return successResponse({ defaultPlanetId: created.id, planetId: created.id });
  }

  if (!body.planetId || typeof body.planetId !== 'string') {
    return ERR_BAD_REQUEST('planetId is required');
  }

  const planet = await prisma.planet.findFirst({
    where: {
      id: body.planetId,
      ownerId: auth.user.id,
    },
    select: { id: true },
  });

  if (!planet) {
    return ERR_BAD_REQUEST('Planet not found');
  }

  await prisma.user.update({
    where: { id: auth.user.id },
    data: { defaultPlanetId: planet.id },
  });

  return successResponse({ defaultPlanetId: planet.id });
}
