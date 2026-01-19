import { getSession, destroySession } from '@/lib/auth';
import { ERR_UNAUTHORIZED, successResponse } from '@/lib/errors';

export async function POST() {
  const auth = await getSession();

  if (!auth) {
    return ERR_UNAUTHORIZED();
  }

  await destroySession();

  return successResponse({});
}
