import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { ERR_UNAUTHORIZED, successResponse } from '@/lib/errors';

export async function GET() {
    const auth = await getSession();
    if (!auth) {
        return ERR_UNAUTHORIZED();
    }

    // Identity에서 GitHub 액세스 토큰 가져오기
    const identity = await prisma.userIdentity.findUnique({
        where: {
            provider_providerUserId: {
                provider: 'github',
                providerUserId: (await prisma.userIdentity.findFirst({
                    where: { userId: auth.user.id, provider: 'github' }
                }))?.providerUserId || '',
            },
        },
    });

    if (!identity || !identity.accessToken) {
        return successResponse({ repos: [] });
    }

    try {
        const res = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
            headers: {
                Authorization: `token ${identity.accessToken}`,
                Accept: 'application/vnd.github.v3+json',
            },
        });

        if (!res.ok) {
            if (res.status === 401) {
                // 토큰 만료 등의 경우 빈 목록 반환 (재로그인 필요)
                return successResponse({ repos: [] });
            }
            throw new Error('Failed to fetch repositories from GitHub');
        }

        const repos = await res.json();
        return successResponse({
            repos: repos.map((repo: any) => ({
                name: repo.name,
                fullName: repo.full_name,
                htmlUrl: repo.html_url,
                description: repo.description,
                defaultBranch: repo.default_branch,
            })),
        });
    } catch (error) {
        console.error('Error fetching GitHub repos:', error);
        return successResponse({ repos: [] });
    }
}
