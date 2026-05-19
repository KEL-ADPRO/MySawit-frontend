import type {
  AdminReviewPayload,
  CreateShipmentPayload,
  DriverStatusUpdatePayload,
  DriverSummary,
  MandorReviewPayload,
  PengirimanApiErrorResponse,
  Shipment,
  ShipmentFilters,
} from "@/lib/pengiriman/types";

const DEFAULT_PENGIRIMAN_API_URL =
  "https://mysawit-backend-manage-pengiriman.onrender.com";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  headers?: Record<string, string | undefined>;
  query?: Record<string, string | number | undefined>;
};

export class PengirimanApiError extends Error {
  status?: number;
  payload?: PengirimanApiErrorResponse;

  constructor(message: string, payload?: PengirimanApiErrorResponse) {
    super(message);
    this.name = "PengirimanApiError";
    this.status = payload?.status;
    this.payload = payload;
  }
}

export function getPengirimanApiBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_PENGIRIMAN_API_URL?.replace(/\/$/, "") ||
    DEFAULT_PENGIRIMAN_API_URL
  );
}

export function getPengirimanErrorMessage(error: unknown) {
  if (error instanceof PengirimanApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Terjadi kesalahan saat menghubungi backend pengiriman.";
}

export const pengirimanApi = {
  /* ── Queries ── */
  getShipments(filters: ShipmentFilters = {}) {
    return request<Shipment[]>("/api/v1/shipments", { query: filters as Record<string, string | undefined> });
  },

  getShipmentById(id: string) {
    return request<Shipment>(`/api/v1/shipments/${encodeURIComponent(id)}`);
  },

  getShipmentsApprovedByMandor(filters: { mandorId?: string; date?: string } = {}) {
    return request<Shipment[]>("/api/v1/shipments/approved-by-mandor", {
      query: filters,
    });
  },

  getDriversForMandor(mandorId: string, search?: string) {
    return request<DriverSummary[]>("/api/v1/shipments/drivers", {
      query: { mandorId, search },
    });
  },

  /* ── Commands ── */
  createShipment(payload: CreateShipmentPayload) {
    return request<Shipment>("/api/v1/shipments", {
      method: "POST",
      body: payload,
    });
  },

  updateDriverStatus(shipmentId: string, payload: DriverStatusUpdatePayload) {
    return request<Shipment>(
      `/api/v1/shipments/${encodeURIComponent(shipmentId)}/driver-status`,
      { method: "PATCH", body: payload },
    );
  },

  reviewByMandor(shipmentId: string, payload: MandorReviewPayload) {
    return request<Shipment>(
      `/api/v1/shipments/${encodeURIComponent(shipmentId)}/mandor-review`,
      { method: "PATCH", body: payload },
    );
  },

  reviewByAdmin(shipmentId: string, payload: AdminReviewPayload) {
    return request<Shipment>(
      `/api/v1/shipments/${encodeURIComponent(shipmentId)}/admin-review`,
      { method: "PATCH", body: payload },
    );
  },
};

/* ── Internals ── */

async function request<T>(path: string, options: RequestOptions = {}) {
  const url = new URL(path, getPengirimanApiBaseUrl());

  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const headers = new Headers();
  for (const [key, value] of Object.entries(options.headers ?? {})) {
    if (value) headers.set(key, value);
  }
  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url.toString(), {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
  });

  const body = await parseResponseBody(response);

  if (!response.ok) {
    const payload = toPengirimanApiErrorResponse(body, response.status);
    throw new PengirimanApiError(
      payload.message ?? payload.error ?? `Request gagal (${response.status}).`,
      payload,
    );
  }

  return body as T;
}

async function parseResponseBody(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function toPengirimanApiErrorResponse(
  value: unknown,
  fallbackStatus: number,
): PengirimanApiErrorResponse {
  if (isRecord(value)) {
    return {
      timestamp: typeof value.timestamp === "string" ? value.timestamp : undefined,
      status: typeof value.status === "number" ? value.status : fallbackStatus,
      message: typeof value.message === "string" ? value.message : undefined,
      error: typeof value.error === "string" ? value.error : undefined,
    };
  }
  if (typeof value === "string" && value.trim()) {
    return { status: fallbackStatus, message: value };
  }
  return { status: fallbackStatus, message: `Request gagal (${fallbackStatus}).` };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
