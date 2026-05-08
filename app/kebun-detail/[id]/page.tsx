import KebunExperience from "@/components/kebun/KebunExperience";

export default async function KebunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <KebunExperience page="detail" kebunId={id} />;
}

