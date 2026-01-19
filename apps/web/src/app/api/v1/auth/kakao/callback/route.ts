import { NextRequest, NextResponse } from 'next/server';
import {
  findOrCreateUserByKakao,
  createSession,
  setSessionCookie,
} from '@/lib/auth';

interface KakaoTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
}

interface KakaoUserResponse {
  id: number;
  kakao_account?: {
    profile?: {
      nickname?: string;
      profile_image_url?: string;
    };
  };
}

async function exchangeCodeForToken(code: string): Promise<KakaoTokenResponse> {
  const clientId = process.env.KAKAO_CLIENT_ID!;
  const clientSecret = process.env.KAKAO_CLIENT_SECRET;
  const redirectUri = process.env.KAKAO_REDIRECT_URI!;

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    redirect_uri: redirectUri,
    code,
  });

  if (clientSecret) {
    params.set('client_secret', clientSecret);
  }

  const response = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code for token: ${error}`);
  }

  return response.json();
}

async function getKakaoUserInfo(accessToken: string): Promise<KakaoUserResponse> {
  const response = await fetch('https://kapi.kakao.com/v2/user/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Kakao user info: ${error}`);
  }

  return response.json();
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  if (error) {
    const errorUrl = new URL('/login', baseUrl);
    errorUrl.searchParams.set('error', error);
    return NextResponse.redirect(errorUrl.toString());
  }

  if (!code) {
    const errorUrl = new URL('/login', baseUrl);
    errorUrl.searchParams.set('error', 'no_code');
    return NextResponse.redirect(errorUrl.toString());
  }

  let redirectPath = '/';
  if (state) {
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64url').toString());
      redirectPath = decoded.redirect || '/';
    } catch {
      // Ignore state parsing errors
    }
  }

  try {
    const tokenData = await exchangeCodeForToken(code);
    const kakaoUser = await getKakaoUserInfo(tokenData.access_token);

    const user = await findOrCreateUserByKakao(String(kakaoUser.id), {
      nickname: kakaoUser.kakao_account?.profile?.nickname,
      profileImage: kakaoUser.kakao_account?.profile?.profile_image_url,
    });

    const { token } = await createSession(user.id);
    await setSessionCookie(token);

    return NextResponse.redirect(new URL(redirectPath, baseUrl).toString());
  } catch (err) {
    console.error('Kakao OAuth error:', err);
    const errorUrl = new URL('/login', baseUrl);
    errorUrl.searchParams.set('error', 'auth_failed');
    return NextResponse.redirect(errorUrl.toString());
  }
}
