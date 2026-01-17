import { PostDetailPageClient } from "@/components/post/PostDetailPageClient";

type Props = {
  params: Promise<{ postId: string }>;
};

export default async function PostDetailPage({ params }: Props) {
  const { postId } = await params;
  return <PostDetailPageClient postId={postId} />;
}
