import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import prisma from './prisma';
import { ERR_UNAUTHORIZED } from './errors';
import type { User, Session } from '@prisma/client';

const SESSION_COOKIE_NAME = 'sid';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface SessionUser {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface AuthResult {
  user: SessionUser;
  session: Session;
}

export async function getSession(): Promise<AuthResult | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { sessionToken },
    include: { user: true },
  });

  if (!session) {
    return null;
  }

  if (new Date() > session.expiresAt) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }

  return {
    user: {
      id: session.user.id,
      username: session.user.username,
      displayName: session.user.displayName,
      avatarUrl: session.user.avatarUrl,
    },
    session,
  };
}

export async function requireAuth(): Promise<AuthResult> {
  const auth = await getSession();
  if (!auth) {
    throw ERR_UNAUTHORIZED();
  }
  return auth;
}

export async function createSession(userId: string): Promise<{ session: Session; token: string }> {
  const sessionToken = uuidv4();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  const session = await prisma.session.create({
    data: {
      sessionToken,
      userId,
      expiresAt,
    },
  });

  return { session, token: sessionToken };
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION_MS / 1000,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionToken) {
    await prisma.session.deleteMany({
      where: { sessionToken },
    });
  }

  cookieStore.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export async function findOrCreateUserByKakao(
  kakaoId: string,
  profile: {
    nickname?: string;
    profileImage?: string;
  }
): Promise<User> {
  const existingIdentity = await prisma.userIdentity.findUnique({
    where: {
      provider_providerUserId: {
        provider: 'kakao',
        providerUserId: kakaoId,
      },
    },
    include: { user: true },
  });

  if (existingIdentity) {
    return existingIdentity.user;
  }

  const user = await prisma.user.create({
    data: {
      displayName: profile.nickname || null,
      avatarUrl: profile.profileImage || null,
      identities: {
        create: {
          provider: 'kakao',
          providerUserId: kakaoId,
        },
      },
    },
  });

  return user;
}
