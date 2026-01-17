import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

function getS3Client(): S3Client {
  return new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

function getBucketName(): string {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) {
    throw new Error('S3_BUCKET is not defined');
  }
  return bucket;
}

export async function createPresignedPutUrl(
  key: string,
  contentType: string,
  expiresIn = 3600
): Promise<string> {
  const client = getS3Client();
  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client, command, { expiresIn });
}

export function getPublicUrl(key: string): string {
  const bucket = getBucketName();
  const region = process.env.AWS_REGION;
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

export function getS3KeyForGraph(jobId: string): string {
  return `codeviz/graphs/${jobId}/graph.json`;
}

export function getS3KeyForCover(uploadId: string): string {
  return `codeviz/covers/${uploadId}.png`;
}

export function getS3KeyForAvatar(uploadId: string): string {
  return `codeviz/avatars/${uploadId}.png`;
}
