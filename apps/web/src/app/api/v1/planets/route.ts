import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
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

  let body: { planetId?: string };
  try {
    body = await request.json();
  } catch {
    return ERR_BAD_REQUEST('Invalid JSON body');
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
