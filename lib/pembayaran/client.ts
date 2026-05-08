import type {
  CreatePayrollPayload,
  PaymentApiErrorResponse,
  PaymentHeaderRole,
  Payroll,
  PayrollFilters,
  TopUpPayload,
  TopUpResponse,
  UpdateWageConfigPayload,
  WageConfig,
  Wallet,
} from "@/lib/pembayaran/types";

const DEFAULT_PEMBAYARAN_API_URL =
  "https://mysawit-backend-manage-pembayaran.onrender.com";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT";
  body?: unknown;
  headers?: Record<string, string | undefined>;
  query?: Record<string, string | number | undefined>;
};

export class PaymentApiError extends Error {
  status?: number;
  fieldErrors?: Record<string, string>;
  payload?: PaymentApiErrorResponse;

  constructor(message: string, payload?: PaymentApiErrorResponse) {
    super(message);
    this.name = "PaymentApiError";
    this.status = payload?.status;
    this.fieldErrors = payload?.fieldErrors;
    this.payload = payload;
  }
}

export function getPembayaranApiBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_PEMBAYARAN_API_URL?.replace(/\/$/, "") ||
    DEFAULT_PEMBAYARAN_API_URL
  );
}

export function getPaymentErrorMessage(error: unknown) {
  if (error instanceof PaymentApiError) {
    const fieldErrorText = formatFieldErrors(error.fieldErrors);

    if (fieldErrorText) {
      return fieldErrorText;
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Terjadi kesalahan saat menghubungi backend pembayaran.";
}

export const pembayaranApi = {
  getMyWallet(userId: string) {
    return request<Wallet>("/api/pembayaran/wallet/me", {
      headers: { "X-User-Id": userId },
    });
  },

  getWallet(userId: string) {
    return request<Wallet>(`/api/pembayaran/wallet/${encodeURIComponent(userId)}`);
  },

  createWallet(userId: string) {
    return request<Wallet>("/api/pembayaran/wallet", {
      method: "POST",
      headers: { "X-User-Id": userId },
    });
  },

  getPayroll(filters: PayrollFilters = {}) {
    return request<Payroll[]>("/api/pembayaran/payroll", {
      query: filters,
    });
  },

  getPayrollById(id: string) {
    return request<Payroll>(`/api/pembayaran/payroll/${encodeURIComponent(id)}`);
  },

  createPayroll(actorUserId: string, payload: CreatePayrollPayload) {
    return request<Payroll>("/api/pembayaran/payroll", {
      method: "POST",
      body: payload,
      headers: { "X-User-Id": actorUserId },
    });
  },

  approvePayroll(id: string, role: PaymentHeaderRole | null) {
    return request<Payroll>(`/api/pembayaran/payroll/${encodeURIComponent(id)}/approve`, {
      method: "PUT",
      headers: { "X-User-Role": role ?? undefined },
    });
  },

  rejectPayroll(id: string, rejectionReason: string) {
    return request<Payroll>(`/api/pembayaran/payroll/${encodeURIComponent(id)}/reject`, {
      method: "PUT",
      body: { rejectionReason },
    });
  },

  getWageConfig() {
    return request<WageConfig>("/api/pembayaran/wage-config");
  },

  updateWageConfig(role: PaymentHeaderRole | null, payload: UpdateWageConfigPayload) {
    return request<WageConfig>("/api/pembayaran/wage-config", {
      method: "PUT",
      body: payload,
      headers: { "X-User-Role": role ?? undefined },
    });
  },

  topUp(role: PaymentHeaderRole | null, payload: TopUpPayload) {
    return request<TopUpResponse>("/api/pembayaran/wallet/topup", {
      method: "POST",
      body: payload,
      headers: { "X-User-Role": role ?? undefined },
    });
  },
};

async function request<T>(path: string, options: RequestOptions = {}) {
  const url = new URL(path, getPembayaranApiBaseUrl());

  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const headers = new Headers();
  for (const [key, value] of Object.entries(options.headers ?? {})) {
    if (value) {
      headers.set(key, value);
    }
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
    const payload = toPaymentApiErrorResponse(body, response.status);
    throw new PaymentApiError(payload.error, payload);
  }

  return body as T;
}

async function parseResponseBody(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function toPaymentApiErrorResponse(
  value: unknown,
  fallbackStatus: number,
): PaymentApiErrorResponse {
  if (isRecord(value)) {
    const error =
      typeof value.error === "string"
        ? value.error
        : `Request pembayaran gagal (${fallbackStatus}).`;

    const fieldErrors = isStringRecord(value.fieldErrors)
      ? value.fieldErrors
      : undefined;

    return {
      timestamp:
        typeof value.timestamp === "string" ? value.timestamp : undefined,
      status: typeof value.status === "number" ? value.status : fallbackStatus,
      error,
      fieldErrors,
    };
  }

  if (typeof value === "string" && value.trim()) {
    return {
      status: fallbackStatus,
      error: value,
    };
  }

  return {
    status: fallbackStatus,
    error: `Request pembayaran gagal (${fallbackStatus}).`,
  };
}

function formatFieldErrors(fieldErrors: Record<string, string> | undefined) {
  if (!fieldErrors) {
    return "";
  }

  return Object.entries(fieldErrors)
    .map(([field, message]) => `${field}: ${message}`)
    .join(", ");
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    isRecord(value) &&
    Object.values(value).every((item) => typeof item === "string")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
