import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const redirect = searchParams.get('redirect') || '/';

    const clientId = process.env.GITHUB_CLIENT_ID;
    const redirectUri = process.env.GITHUB_REDIRECT_URI;

    if (!clientId || !redirectUri) {
        return NextResponse.json(
            { ok: false, error: { code: 'ERR_CONFIG', message: 'GitHub OAuth not configured' } },
            { status: 500 }
        );
    }

    // 복귀할 경로(redirect)를 state에 저장해둡니다.
    const state = Buffer.from(JSON.stringify({ redirect })).toString('base64url');

    const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
    githubAuthUrl.searchParams.set('client_id', clientId);
    githubAuthUrl.searchParams.set('redirect_uri', redirectUri);
    githubAuthUrl.searchParams.set('state', state);
    githubAuthUrl.searchParams.set('scope', 'read:user user:email');

    return NextResponse.redirect(githubAuthUrl.toString());
}
