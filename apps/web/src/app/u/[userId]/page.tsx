import { UserProfileClient } from "@/components/users/UserProfileClient";

type Props = {
  params: Promise<{ userId: string }>;
};

export default async function UserProfilePage({ params }: Props) {
  const { userId } = await params;
  return <UserProfileClient userId={userId} />;
}
