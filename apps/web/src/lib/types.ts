// apps/web/src/lib/types.ts
export type Author = {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl?: string | null;
};

export type PostCard = {
  postId: string;
  title: string;
  coverUrl?: string | null;
  author: Author;
  likeCount: number;
  commentCount: number;
  createdAt: string;
};

export type FeedResponse = {
  ok: true;
  data: { items: PostCard[]; nextCursor: string | null };
};

export type MeResponse =
  | { ok: true; data: { user: Author } }
  | { ok: false; error: { code: string; message: string } };

export type ProjectCard = {
  id: string;
  title: string;
  repoUrl: string;
  ref: string | null;
  coverUrl?: string | null;
  status: "draft" | "ready" | "error";
  updatedAt: string;
};

export type MyProjectsResponse = {
  ok: true;
  data: { items: ProjectCard[]; nextCursor: string | null };
};

export type ProjectDetailResponse = {
  ok: true;
  data: {
    project: {
      id: string;
      ownerId: string;
      title: string;
      repoUrl: string;
      ref: string | null;
      status: string;
      coverUrl?: string | null;
      currentConfig?: Record<string, unknown>;
      latestJob?: {
        id: string;
        status: "queued" | "running" | "done" | "failed" | "canceled";
        progress: number | null;
        message: string | null;
        result?: {
          resultUrl: string;
          stats?: Record<string, unknown>;
        } | null;
      } | null;
      createdAt: string;
      updatedAt: string;
    };
  };
};

export type CreateProjectResponse = {
  ok: true;
  data: {
    project: {
      id: string;
      title: string;
      repoUrl: string;
      ref: string | null;
      status: string;
      latestJob?: { id: string; status: string } | null;
    };
  };
};

export type PostDetail = {
  id: string;
  title: string;
  body: string | null;
  visibility: string;
  tags: string[];
  coverUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  author: Author;
  snapshot: {
    id: string;
    coverUrl: string | null;
    config: Record<string, unknown>;
    job: {
      id: string;
      status: string;
    } | null;
  };
  projectLink: {
    projectId: string;
    viewerUrl: string;
  };
  counts: {
    likes: number;
    comments: number;
  };
};

export type PostDetailResponse = {
  ok: true;
  data: { post: PostDetail };
};

export type Comment = {
  id: string;
  postId: string;
  body: string;
  parentId: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  author: Author;
};

export type ListCommentsResponse = {
  ok: true;
  data: { items: Comment[]; nextCursor: string | null };
};

export type CreateCommentResponse = {
  ok: true;
  data: { comment: Comment };
};

export type ToggleLikeResponse = {
  ok: true;
  data: { liked: boolean; likeCount: number };
};

export type ToggleFollowResponse = {
  ok: true;
  data: { following: boolean; followerCount: number };
};

export type UserProfileResponse = {
  ok: true;
  data: {
    user: {
      id: string;
      username: string | null;
      displayName: string | null;
      avatarUrl?: string | null;
      bio?: string | null;
    };
    stats: { posts: number; followers: number; following: number };
  };
};

export type MyProfileResponse = {
  ok: true;
  data: {
    user: {
      id: string;
      username: string | null;
      displayName: string | null;
      avatarUrl?: string | null;
      bio?: string | null;
    };
  };
};

export type UpdateProfileResponse = {
  ok: true;
  data: {
    user: {
      id: string;
      username: string | null;
      displayName: string | null;
      avatarUrl?: string | null;
      bio?: string | null;
    };
  };
};

export type ListUserPostsResponse = {
  ok: true;
  data: { items: PostCard[]; nextCursor: string | null };
};

export type CreateSnapshotResponse = {
  ok: true;
  data: {
    snapshot: {
      id: string;
      projectId: string;
      jobId: string | null;
      config: Record<string, unknown>;
      coverUrl: string | null;
      createdAt: string;
    };
  };
};

export type CreatePostResponse = {
  ok: true;
  data: {
    post: {
      id: string;
      visibility: string;
      authorId: string;
      createdAt: string;
    };
  };
};

export type ResultUrlResponse = {
  ok: true;
  data: {
    url: string;
    expiresIn: number;
  };
};

export type SymbolInfo = {
  symbol: string;
  kind: string;
  line: number;
};

export type GraphNode = {
  id: string;
  name: string;
  path?: string;
  type: string;
  parent?: string | null;
  loc?: number;
  lines?: number;
  language?: string;
  symbols?: SymbolInfo[];
};

export type GraphEdge = {
  source: string;
  target: string;
  type: string;
};

export type CommitFile = {
  path: string;
  status: string;
};

export type CommitInfo = {
  hash: string;
  message: string;
  author: string;
  timestamp: number;
  files: CommitFile[];
};

export type GraphStats = {
  nodeCount: number;
  edgeCount: number;
  fileCount: number;
  directoryCount: number;
  totalLines: number;
  languages?: Record<string, number>;
  commitCount?: number;
};

export type GraphData = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  history?: CommitInfo[];
  stats?: GraphStats;
  metadata?: {
    repoUrl: string;
    ref?: string | null;
    analyzedAt?: string;
    version?: string;
  };
};
