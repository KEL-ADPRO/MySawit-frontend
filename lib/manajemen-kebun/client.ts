import type {
  Kebun,
  KebunApiErrorResponse,
  KebunFilters,
  KebunUpsertPayload,
} from "@/lib/manajemen-kebun/types";

const DEFAULT_KEBUN_API_URL = process.env.NEXT_PUBLIC_KEBUN_API_URL?.replace(/\/$/, "");

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string | undefined>;
  query?: Record<string, string | number | undefined>;
};

export class KebunApiError extends Error {
  status?: number;
  fieldErrors?: Record<string, string>;
  payload?: KebunApiErrorResponse;

  constructor(message: string, payload?: KebunApiErrorResponse) {
    super(message);
    this.name = "KebunApiError";
    this.status = payload?.status;
    this.fieldErrors = payload?.fieldErrors;
    this.payload = payload;
  }
}

export function getKebunErrorMessage(error: unknown) {
  if (error instanceof KebunApiError) {
    const fieldErrorText = formatFieldErrors(error.fieldErrors);
    return fieldErrorText || error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Terjadi kesalahan saat menghubungi backend kebun.";
}

export const kebunApi = {
  getKebuns(filters: KebunFilters = {}) {
    return request<Kebun[]>('/api/kebun', { query: filters });
  },

  getKebunById(id: string) {
    return request<Kebun>(`/api/kebun/${encodeURIComponent(id)}`);
  },

  createKebun(payload: KebunUpsertPayload) {
    return request<Kebun>('/api/kebun', {
      method: 'POST',
      body: payload,
    });
  },

  updateKebun(id: string, payload: KebunUpsertPayload) {
    return request<Kebun>(`/api/kebun/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: payload,
    });
  },

  deleteKebun(id: string) {
    return request<void>(`/api/kebun/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  assignMandor(kebunId: string, mandorId: string) {
    return request<Kebun>(
      `/api/kebun/${encodeURIComponent(kebunId)}/mandor/${encodeURIComponent(mandorId)}`,
      { method: 'PATCH' },
    );
  },

  assignSupir(kebunId: string, supirId: string) {
    return request<Kebun>(
      `/api/kebun/${encodeURIComponent(kebunId)}/supir/${encodeURIComponent(supirId)}`,
      { method: 'PATCH' },
    );
  },

  removeSupir(kebunId: string, supirId: string) {
    return request<Kebun>(
      `/api/kebun/${encodeURIComponent(kebunId)}/supir/${encodeURIComponent(supirId)}`,
      { method: 'DELETE' },
    );
  },

  checkMandorAssignment(mandorId: string) {
    return request<Record<string, unknown>>(
      `/api/kebun/check-mandor/${encodeURIComponent(mandorId)}`,
    );
  },

  checkSupirAssignment(supirId: string) {
    return request<Record<string, unknown>>(
      `/api/kebun/check-supir/${encodeURIComponent(supirId)}`,
    );
  },
};

async function request<T>(path: string, options: RequestOptions = {}) {
  const url = buildUrl(path, options.query);
  const headers = new Headers();

  for (const [key, value] of Object.entries(options.headers ?? {})) {
    if (value) {
      headers.set(key, value);
    }
  }

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: 'no-store',
  });

  const body = await parseResponseBody(response);

  if (!response.ok) {
    const payload = toKebunApiErrorResponse(body, response.status);
    throw new KebunApiError(payload.error, payload);
  }

  return normalizeResponse<T>(body);
}

function buildUrl(
  path: string,
  query: Record<string, string | number | undefined> = {},
) {
  const trimmedPath = path.startsWith('/') ? path : `/${path}`;

  if (!DEFAULT_KEBUN_API_URL) {
    const url = new URL(trimmedPath, 'http://localhost');
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }

    return `${url.pathname}${url.search}`;
  }

  const url = new URL(trimmedPath, DEFAULT_KEBUN_API_URL);

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
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

function normalizeResponse<T>(value: unknown) {
  return value as T;
}

function toKebunApiErrorResponse(
  value: unknown,
  fallbackStatus: number,
): KebunApiErrorResponse {
  if (isRecord(value)) {
    return {
      timestamp: typeof value.timestamp === 'string' ? value.timestamp : undefined,
      status: typeof value.status === 'number' ? value.status : fallbackStatus,
      error:
        typeof value.error === 'string'
          ? value.error
          : `Request kebun gagal (${fallbackStatus}).`,
      fieldErrors: isStringRecord(value.fieldErrors) ? value.fieldErrors : undefined,
    };
  }

  if (typeof value === 'string' && value.trim()) {
    return { status: fallbackStatus, error: value };
  }

  return {
    status: fallbackStatus,
    error: `Request kebun gagal (${fallbackStatus}).`,
  };
}

function formatFieldErrors(fieldErrors: Record<string, string> | undefined) {
  if (!fieldErrors) {
    return '';
  }

  return Object.entries(fieldErrors)
    .map(([field, message]) => `${field}: ${message}`)
    .join(', ');
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    isRecord(value) &&
    Object.values(value).every((item) => typeof item === 'string')
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
