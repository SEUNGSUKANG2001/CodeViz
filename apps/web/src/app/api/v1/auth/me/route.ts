import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { ERR_UNAUTHORIZED, successResponse } from '@/lib/errors';

export async function GET() {
  const auth = await getSession();

  if (!auth) {
    return ERR_UNAUTHORIZED();
  }

  return successResponse({
    user: {
      id: auth.user.id,
      username: auth.user.username,
      displayName: auth.user.displayName,
      avatarUrl: auth.user.avatarUrl,
    },
  });
}
