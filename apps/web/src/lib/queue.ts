import { createRedisClient } from './redis';

const QUEUE_NAME = 'codeviz:jobs';

export interface JobPayload {
  jobId: string;
}

export async function enqueueJob(jobId: string): Promise<void> {
  const redis = createRedisClient();
  try {
    const payload: JobPayload = { jobId };
    await redis.lpush(QUEUE_NAME, JSON.stringify(payload));
  } finally {
    await redis.quit();
  }
}

export async function getQueueLength(): Promise<number> {
  const redis = createRedisClient();
  try {
    return await redis.llen(QUEUE_NAME);
  } finally {
    await redis.quit();
  }
}
