import { NextRequest, NextResponse } from 'next/server';
import {
    findOrCreateUserByProvider,
    createSession,
    setSessionCookie,
} from '@/lib/auth';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code'); // 이거랑 access token이랑 교환
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    if (error || !code) {  // 로그인 실패 시 로그인 페이지로 돌린다.
        const errorUrl = new URL('/login', baseUrl);
        if (error) errorUrl.searchParams.set('error', error);
        return NextResponse.redirect(errorUrl.toString());
    }

    let redirectPath = '/'; // 로그인 성공 시 복귀할 경로
    if (state) {
        try {
            const decoded = JSON.parse(Buffer.from(state, 'base64url').toString());
            redirectPath = decoded.redirect || '/';
        } catch { /* ignore */ }
    }

    try {
        // 1. GitHub Access Token으로 교환
        const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code,
            }),
        });

        const tokenData = await tokenRes.json();
        if (!tokenData.access_token) {
            throw new Error('Failed to get access token from GitHub');
        }

        // 2. GitHub 사용자 정보 가져오기
        const userRes = await fetch('https://api.github.com/user', {
            headers: {
                Authorization: `token ${tokenData.access_token}`,
                Accept: 'application/vnd.github.v3+json',
            },
        });

        const githubUser = await userRes.json();

        // 3. DB 사용자 연동 (제네릭 함수 사용)
        const user = await findOrCreateUserByProvider('github', String(githubUser.id), {
            nickname: githubUser.login,
            profileImage: githubUser.avatar_url,
            accessToken: tokenData.access_token,
        });

        // 4. 세션 생성 및 쿠키 설정
        const { token } = await createSession(user.id);
        await setSessionCookie(token);

        return NextResponse.redirect(new URL(redirectPath, baseUrl).toString());
    } catch (err) {
        console.error('GitHub OAuth error:', err);
        const errorUrl = new URL('/login', baseUrl);
        errorUrl.searchParams.set('error', 'auth_failed');
        return NextResponse.redirect(errorUrl.toString());
    }
}
