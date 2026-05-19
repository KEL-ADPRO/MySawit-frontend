"use client";

import { useParams } from "next/navigation";
import { PengirimanExperience } from "@/components/pengiriman/PengirimanExperience";

export default function ShipmentDetailPage() {
  const params = useParams<{ id: string }>();
  return <PengirimanExperience page="detail" shipmentId={params.id} />;
}
