import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import {
  ERR_UNAUTHORIZED,
  ERR_BAD_REQUEST,
  successResponse,
} from '@/lib/errors';
import {
  createPresignedPutUrl,
  getPublicUrl,
  getS3KeyForCover,
  getS3KeyForAvatar,
} from '@/lib/s3';

const ALLOWED_CONTENT_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
];

export async function POST(request: NextRequest) {
  const auth = await getSession();
  if (!auth) {
    return ERR_UNAUTHORIZED();
  }

  let body: { type?: 'post_cover' | 'avatar'; contentType?: string };
  try {
    body = await request.json();
  } catch {
    return ERR_BAD_REQUEST('Invalid JSON body');
  }

  if (!body.type || !['post_cover', 'avatar'].includes(body.type)) {
    return ERR_BAD_REQUEST('type must be "post_cover" or "avatar"');
  }

  if (!body.contentType || !ALLOWED_CONTENT_TYPES.includes(body.contentType)) {
    return ERR_BAD_REQUEST('Invalid contentType. Allowed: ' + ALLOWED_CONTENT_TYPES.join(', '));
  }

  const uploadId = uuidv4();
  const s3Key = body.type === 'avatar'
    ? getS3KeyForAvatar(uploadId)
    : getS3KeyForCover(uploadId);

  const putUrl = await createPresignedPutUrl(s3Key, body.contentType);
  const publicUrl = getPublicUrl(s3Key);

  await prisma.upload.create({
    data: {
      id: uploadId,
      type: body.type,
      publicUrl,
      s3Key,
      contentType: body.contentType,
      createdBy: auth.user.id,
    },
  });

  return successResponse({
    upload: {
      uploadId,
      putUrl,
      publicUrl,
    },
  });
}
