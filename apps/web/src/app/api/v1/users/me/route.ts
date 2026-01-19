import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import {
  ERR_UNAUTHORIZED,
  ERR_BAD_REQUEST,
  successResponse,
} from '@/lib/errors';
import { formatUserProfile } from '@/lib/helpers';

export async function GET() {
  const auth = await getSession();
  if (!auth) {
    return ERR_UNAUTHORIZED();
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.user.id },
  });

  if (!user) {
    return ERR_UNAUTHORIZED();
  }

  return successResponse({
    user: formatUserProfile(user),
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await getSession();
  if (!auth) {
    return ERR_UNAUTHORIZED();
  }

  let body: {
    displayName?: string | null;
    bio?: string | null;
    avatarUploadId?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return ERR_BAD_REQUEST('Invalid JSON body');
  }

  const updateData: Record<string, unknown> = {};

  if (body.displayName !== undefined) {
    if (body.displayName && body.displayName.length > 80) {
      return ERR_BAD_REQUEST('displayName must be less than 80 characters');
    }
    updateData.displayName = body.displayName;
  }

  if (body.bio !== undefined) {
    if (body.bio && body.bio.length > 500) {
      return ERR_BAD_REQUEST('bio must be less than 500 characters');
    }
    updateData.bio = body.bio;
  }

  if (body.avatarUploadId) {
    const upload = await prisma.upload.findUnique({
      where: { id: body.avatarUploadId },
    });

    if (upload && upload.createdBy === auth.user.id && upload.type === 'avatar') {
      updateData.avatarUrl = upload.publicUrl;
    }
  }

  const user = await prisma.user.update({
    where: { id: auth.user.id },
    data: updateData,
  });

  return successResponse({
    user: formatUserProfile(user),
  });
}
