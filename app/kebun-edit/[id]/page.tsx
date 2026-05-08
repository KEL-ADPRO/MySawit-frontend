import KebunExperience from "@/components/kebun/KebunExperience";

export default async function KebunEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <KebunExperience page="edit" kebunId={id} />;
}

