// API Type Definitions

export interface ApiResponse<T> {
  ok: true;
  data: T;
}

export interface ApiError {
  ok: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

// User types
export interface UserSummary {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface UserProfile extends UserSummary {
  bio: string | null;
}

// Project types
export type ProjectStatus = 'draft' | 'ready' | 'error';
export type JobStatus = 'queued' | 'running' | 'done' | 'failed' | 'canceled';

export interface AnalysisJobResult {
  resultUrl: string;
  stats?: Record<string, unknown>;
}

export interface AnalysisJob {
  id: string;
  status: JobStatus;
  progress: number | null;
  message: string | null;
  result: AnalysisJobResult | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectCard {
  id: string;
  title: string;
  repoUrl: string;
  ref: string | null;
  coverUrl: string | null;
  status: ProjectStatus;
  updatedAt: string;
}

export interface ProjectDetail extends ProjectCard {
  ownerId: string;
  currentConfig: Record<string, unknown>;
  latestJob: AnalysisJob | null;
  createdAt: string;
}

// Post types
export type PostVisibility = 'public' | 'unlisted' | 'private';

export interface PostCard {
  postId: string;
  title: string;
  coverUrl: string | null;
  author: UserSummary;
  likeCount: number;
  commentCount: number;
  createdAt: string;
}

export interface PostDetail {
  id: string;
  visibility: PostVisibility;
  title: string;
  body: string | null;
  tags: string[];
  author: UserSummary;
  planet?: {
    id: string;
    seed: number;
    params: Record<string, unknown>;
    palette: Record<string, unknown>;
    cloudColor: Record<string, unknown>;
    projectId: string | null;
  } | null;
  snapshot: {
    id: string;
    coverUrl: string | null;
    config: Record<string, unknown>;
    job: {
      resultUrl: string | null;
    };
  };
  projectLink: {
    projectId: string;
    viewerUrl: string;
  };
  counts: {
    likes: number;
    comments: number;
  };
  createdAt: string;
  updatedAt: string;
}

// Comment types
export interface Comment {
  id: string;
  postId: string;
  author: UserSummary;
  body: string;
  parentId: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

// Snapshot types
export interface Snapshot {
  id: string;
  projectId: string;
  jobId: string | null;
  config: Record<string, unknown>;
  coverUrl: string | null;
  createdAt: string;
}

// Upload types
export type UploadType = 'post_cover' | 'avatar';

export interface UploadGrant {
  uploadId: string;
  putUrl: string;
  publicUrl: string;
}
