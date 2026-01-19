import type { AnalysisJob, Project, Snapshot, Post, Comment, User } from '@prisma/client';

export function formatJob(job: AnalysisJob) {
  return {
    id: job.id,
    status: job.status,
    progress: job.progress,
    message: job.message,
    result: job.resultUrl
      ? {
          resultUrl: job.resultUrl,
          stats: job.statsJson as Record<string, unknown> | undefined,
        }
      : null,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}

export function formatProjectCard(project: Project & { jobs?: AnalysisJob[] }) {
  const latestJob = project.jobs?.[0];
  return {
    id: project.id,
    title: project.title,
    repoUrl: project.repoUrl,
    ref: project.ref,
    coverUrl: project.coverUrl,
    latestJob: latestJob ? formatJob(latestJob) : null,
    currentConfig: project.currentConfig,
    status: project.status,
    updatedAt: project.updatedAt.toISOString(),
  };
}

export function formatProjectDetail(
  project: Project & { jobs?: AnalysisJob[] }
) {
  const latestJob = project.jobs?.[0];
  return {
    id: project.id,
    ownerId: project.ownerId,
    repoUrl: project.repoUrl,
    ref: project.ref,
    title: project.title,
    currentConfig: project.currentConfig,
    coverUrl: project.coverUrl,
    status: project.status,
    latestJob: latestJob ? formatJob(latestJob) : null,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

export function formatSnapshot(
  snapshot: Snapshot & { job?: AnalysisJob | null }
) {
  return {
    id: snapshot.id,
    projectId: snapshot.projectId,
    jobId: snapshot.jobId,
    config: snapshot.config,
    coverUrl: snapshot.coverUrl,
    createdAt: snapshot.createdAt.toISOString(),
  };
}

export function formatUserSummary(user: Pick<User, 'id' | 'username' | 'displayName' | 'avatarUrl'>) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  };
}

export function formatUserProfile(user: Pick<User, 'id' | 'username' | 'displayName' | 'avatarUrl' | 'bio'>) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
  };
}

export function formatPostCard(
  post: Post & { author: User; _count: { likes: number; comments: number } },
  snapshot?: Snapshot & { job?: AnalysisJob | null }
) {
  return {
    postId: post.id,
    title: post.title,
    coverUrl: snapshot?.coverUrl ?? null,
    jobId: snapshot?.job?.id ?? snapshot?.jobId ?? null,
    jobStatus: snapshot?.job?.status ?? null,
    theme: (snapshot?.config as Record<string, unknown> | null)?.theme as string | null,
    author: formatUserSummary(post.author),
    likeCount: post._count.likes,
    commentCount: post._count.comments,
    createdAt: post.createdAt.toISOString(),
  };
}

export function formatComment(
  comment: Comment & { author: User }
) {
  return {
    id: comment.id,
    postId: comment.postId,
    author: formatUserSummary(comment.author),
    body: comment.body,
    parentId: comment.parentId,
    isDeleted: comment.isDeleted,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
  };
}

export function extractTitleFromRepoUrl(repoUrl: string): string {
  try {
    const url = new URL(repoUrl);
    const parts = url.pathname.split('/').filter(Boolean);
    return parts[parts.length - 1] || 'Untitled';
  } catch {
    return 'Untitled';
  }
}

export function parseCursor(cursor: string | null): { id: string; createdAt: Date } | null {
  if (!cursor) return null;
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString();
    const { id, createdAt } = JSON.parse(decoded);
    return { id, createdAt: new Date(createdAt) };
  } catch {
    return null;
  }
}

export function encodeCursor(id: string, createdAt: Date): string {
  return Buffer.from(JSON.stringify({ id, createdAt: createdAt.toISOString() })).toString('base64url');
}
