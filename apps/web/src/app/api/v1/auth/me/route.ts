import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { ERR_UNAUTHORIZED, ERR_INTERNAL, successResponse } from '@/lib/errors';

export async function GET() {
  try {
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
  } catch (error: any) {
    console.error('Error in /api/v1/auth/me:', error);
    return ERR_INTERNAL(error.message || 'Internal Server Error');
  }
}
