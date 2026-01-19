import { ViewerShell } from "@/components/viewer/ViewerShell";

type Props = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectViewerPage({ params }: Props) {
  const { projectId } = await params;
  return <ViewerShell projectId={projectId} />;
}
