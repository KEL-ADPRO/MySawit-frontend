/* ── Shipment status lifecycle ── */
export const SHIPMENT_STATUSES = [
  "MEMUAT",
  "MENGIRIM",
  "TIBA_DI_TUJUAN",
  "DISETUJUI_MANDOR",
  "DITOLAK_MANDOR",
  "DISETUJUI_ADMIN",
  "DITOLAK_ADMIN",
  "DITOLAK_PARSIAL_ADMIN",
] as const;

export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

export function isShipmentStatus(v: unknown): v is ShipmentStatus {
  return SHIPMENT_STATUSES.includes(v as ShipmentStatus);
}

/* ── Domain models ── */
export interface Shipment {
  id: string;
  driverId: string;
  mandorId: string;
  harvestIds: string[];
  totalWeightKg: number;
  recognizedWeightKg: number | null;
  status: ShipmentStatus;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  mandorReviewedAt: string | null;
  adminReviewedAt: string | null;
}

export interface DriverSummary {
  id: string;
  name: string;
  estateId: string;
}

/* ── Request payloads ── */
export interface CreateShipmentPayload {
  mandorId: string;
  driverId: string;
  harvestIds: string[];
}

export interface DriverStatusUpdatePayload {
  driverId: string;
  newStatus: ShipmentStatus;
}

export interface MandorReviewPayload {
  mandorId: string;
  approved: boolean;
  rejectionReason?: string;
}

export type AdminReviewDecision = "APPROVE" | "REJECT" | "PARTIAL_REJECT";

export interface AdminReviewPayload {
  adminId: string;
  decision: AdminReviewDecision;
  recognizedWeightKg?: number;
  rejectionReason?: string;
}

/* ── Query filters ── */
export interface ShipmentFilters {
  driverId?: string;
  mandorId?: string;
  status?: ShipmentStatus;
  date?: string;
}

/* ── Error shape from Spring Boot ── */
export interface PengirimanApiErrorResponse {
  timestamp?: string;
  status?: number;
  message?: string;
  error?: string;
}

/* ── Viewer roles (for dev toolbar) ── */
export const PENGIRIMAN_ROLES = ["ADMIN", "MANDOR", "SUPIR_TRUK"] as const;
export type PengirimanRole = (typeof PENGIRIMAN_ROLES)[number];

export function isPengirimanRole(v: unknown): v is PengirimanRole {
  return PENGIRIMAN_ROLES.includes(v as PengirimanRole);
}

/* ── Status display helpers ── */
export const STATUS_LABELS: Record<ShipmentStatus, string> = {
  MEMUAT: "Memuat",
  MENGIRIM: "Mengirim",
  TIBA_DI_TUJUAN: "Tiba di Tujuan",
  DISETUJUI_MANDOR: "Disetujui Mandor",
  DITOLAK_MANDOR: "Ditolak Mandor",
  DISETUJUI_ADMIN: "Disetujui Admin",
  DITOLAK_ADMIN: "Ditolak Admin",
  DITOLAK_PARSIAL_ADMIN: "Ditolak Parsial Admin",
};

export const STATUS_COLORS: Record<ShipmentStatus, string> = {
  MEMUAT: "#2563eb",
  MENGIRIM: "#d97706",
  TIBA_DI_TUJUAN: "#7c3aed",
  DISETUJUI_MANDOR: "#059669",
  DITOLAK_MANDOR: "#dc2626",
  DISETUJUI_ADMIN: "#174905",
  DITOLAK_ADMIN: "#dc2626",
  DITOLAK_PARSIAL_ADMIN: "#ea580c",
};
