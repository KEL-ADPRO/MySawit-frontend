import {
  type PaymentHeaderRole,
  isPaymentHeaderRole,
} from "@/lib/pembayaran/types";

export type PaymentSession = {
  userId: string | null;
  role: PaymentHeaderRole | null;
  source: string | null;
};

const DEV_USER_ID_KEY = "mysawit.payment.devUserId";
const DEV_ROLE_KEY = "mysawit.payment.devUserRole";

const USER_ID_KEYS = [
  "userid",
  "user_id",
  "id",
  "sub",
  "uuid",
  "xuserid",
  "x-user-id",
  "activeuserid",
  "active_user_id",
];

const ROLE_KEYS = [
  "role",
  "userrole",
  "user_role",
  "xuserrole",
  "x-user-role",
  "authority",
  "authorities",
];

const DIRECT_USER_ID_KEYS = [
  "userId",
  "user_id",
  "activeUserId",
  "x-user-id",
  "X-User-Id",
  "mysawit.userId",
];

const DIRECT_ROLE_KEYS = [
  "role",
  "userRole",
  "user_role",
  "x-user-role",
  "X-User-Role",
  "mysawit.role",
];

const KNOWN_SESSION_KEYS = [
  "auth",
  "session",
  "user",
  "currentUser",
  "mysawit.auth",
  "mysawit.session",
  "mysawit.user",
  "persist:auth",
  "persist:root",
];

const KNOWN_TOKEN_KEYS = [
  "token",
  "accessToken",
  "access_token",
  "authToken",
  "jwt",
  "mysawit.token",
  "mysawit.accessToken",
];

const MAX_SEARCH_DEPTH = 5;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isPaymentUuid(value: string | null | undefined): value is string {
  return Boolean(value && UUID_PATTERN.test(value));
}

export function canUseDevPaymentSessionOverride() {
  return process.env.NODE_ENV !== "production";
}

export function readPaymentSession(): PaymentSession {
  if (typeof window === "undefined") {
    return { userId: null, role: null, source: null };
  }

  const devSession = readDevPaymentSession();
  if (devSession.userId || devSession.role) {
    return devSession;
  }

  const directSession = readDirectLocalStorageSession();
  if (directSession.userId || directSession.role) {
    return directSession;
  }

  const knownSession = readKnownLocalStorageSession();
  if (knownSession.userId || knownSession.role) {
    return knownSession;
  }

  const tokenSession = readKnownTokenSession();
  if (tokenSession.userId || tokenSession.role) {
    return tokenSession;
  }

  return readAllLocalStorageSession();
}

export function saveDevPaymentSession(
  userId: string,
  role: PaymentHeaderRole,
) {
  if (!canUseDevPaymentSessionOverride() || typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(DEV_USER_ID_KEY, userId);
  window.localStorage.setItem(DEV_ROLE_KEY, role);
}

export function clearDevPaymentSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(DEV_USER_ID_KEY);
  window.localStorage.removeItem(DEV_ROLE_KEY);
}

export function normalizePaymentRole(
  value: unknown,
): PaymentHeaderRole | null {
  const role = extractString(value)
    ?.trim()
    .toUpperCase()
    .replace(/^ROLE_/, "")
    .replace(/[\s-]+/g, "_");

  if (!role) {
    return null;
  }

  return isPaymentHeaderRole(role) ? role : null;
}

function readDevPaymentSession(): PaymentSession {
  if (!canUseDevPaymentSessionOverride() || typeof window === "undefined") {
    return { userId: null, role: null, source: null };
  }

  return {
    userId: normalizeUserId(window.localStorage.getItem(DEV_USER_ID_KEY)),
    role: normalizePaymentRole(window.localStorage.getItem(DEV_ROLE_KEY)),
    source: "localStorage:dev-payment-session",
  };
}

function readDirectLocalStorageSession(): PaymentSession {
  let userId: string | null = null;
  let role: PaymentHeaderRole | null = null;
  let source: string | null = null;

  for (const key of DIRECT_USER_ID_KEYS) {
    const value = normalizeUserId(window.localStorage.getItem(key));
    if (value) {
      userId = value;
      source = `localStorage:${key}`;
      break;
    }
  }

  for (const key of DIRECT_ROLE_KEYS) {
    const value = normalizePaymentRole(window.localStorage.getItem(key));
    if (value) {
      role = value;
      source = source ?? `localStorage:${key}`;
      break;
    }
  }

  return { userId, role, source };
}

function readKnownLocalStorageSession(): PaymentSession {
  for (const key of KNOWN_SESSION_KEYS) {
    const raw = window.localStorage.getItem(key);
    const parsed = parsePossiblyNestedJson(raw);
    const session = extractSession(parsed, `localStorage:${key}`);

    if (session.userId || session.role) {
      return session;
    }
  }

  return { userId: null, role: null, source: null };
}

function readKnownTokenSession(): PaymentSession {
  for (const key of KNOWN_TOKEN_KEYS) {
    const raw = window.localStorage.getItem(key);
    const session = extractSessionFromToken(raw, `localStorage:${key}`);

    if (session.userId || session.role) {
      return session;
    }
  }

  return { userId: null, role: null, source: null };
}

function readAllLocalStorageSession(): PaymentSession {
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key) {
      continue;
    }

    const raw = window.localStorage.getItem(key);
    const tokenSession = extractSessionFromToken(raw, `localStorage:${key}`);

    if (tokenSession.userId || tokenSession.role) {
      return tokenSession;
    }

    const parsed = parsePossiblyNestedJson(raw);
    const objectSession = extractSession(parsed, `localStorage:${key}`);

    if (objectSession.userId || objectSession.role) {
      return objectSession;
    }
  }

  return { userId: null, role: null, source: null };
}

function extractSession(value: unknown, source: string): PaymentSession {
  return {
    userId: findStringByKeys(value, USER_ID_KEYS),
    role: findRoleByKeys(value, ROLE_KEYS),
    source,
  };
}

function extractSessionFromToken(
  token: string | null,
  source: string,
): PaymentSession {
  const payload = decodeJwtPayload(token);
  if (!payload) {
    return { userId: null, role: null, source: null };
  }

  return extractSession(payload, source);
}

function findStringByKeys(
  value: unknown,
  targetKeys: string[],
  depth = 0,
): string | null {
  if (depth > MAX_SEARCH_DEPTH || !isRecord(value)) {
    return null;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    const normalizedKey = normalizeObjectKey(key);

    if (targetKeys.includes(normalizedKey)) {
      const foundValue = normalizeUserId(nestedValue);
      if (foundValue) {
        return foundValue;
      }
    }
  }

  for (const nestedValue of Object.values(value)) {
    if (Array.isArray(nestedValue)) {
      for (const arrayValue of nestedValue) {
        const foundValue = findStringByKeys(arrayValue, targetKeys, depth + 1);
        if (foundValue) {
          return foundValue;
        }
      }
    } else {
      const foundValue = findStringByKeys(nestedValue, targetKeys, depth + 1);
      if (foundValue) {
        return foundValue;
      }
    }
  }

  return null;
}

function findRoleByKeys(
  value: unknown,
  targetKeys: string[],
  depth = 0,
): PaymentHeaderRole | null {
  if (depth > MAX_SEARCH_DEPTH || !isRecord(value)) {
    return null;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    const normalizedKey = normalizeObjectKey(key);

    if (targetKeys.includes(normalizedKey)) {
      const foundValue = normalizePaymentRole(nestedValue);
      if (foundValue) {
        return foundValue;
      }

      if (Array.isArray(nestedValue)) {
        for (const arrayValue of nestedValue) {
          const arrayRole = normalizePaymentRole(arrayValue);
          if (arrayRole) {
            return arrayRole;
          }
        }
      }
    }
  }

  for (const nestedValue of Object.values(value)) {
    if (Array.isArray(nestedValue)) {
      for (const arrayValue of nestedValue) {
        const foundValue = findRoleByKeys(arrayValue, targetKeys, depth + 1);
        if (foundValue) {
          return foundValue;
        }
      }
    } else {
      const foundValue = findRoleByKeys(nestedValue, targetKeys, depth + 1);
      if (foundValue) {
        return foundValue;
      }
    }
  }

  return null;
}

function decodeJwtPayload(token: string | null): unknown {
  if (!token || token.split(".").length < 3) {
    return null;
  }

  try {
    const payload = token.split(".")[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = window.atob(base64);

    return JSON.parse(decoded) as unknown;
  } catch {
    return null;
  }
}

function parsePossiblyNestedJson(value: string | null): unknown {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (isRecord(parsed)) {
      return expandNestedJsonStrings(parsed);
    }

    return parsed;
  } catch {
    return null;
  }
}

function expandNestedJsonStrings(value: unknown, depth = 0): unknown {
  if (depth > MAX_SEARCH_DEPTH) {
    return value;
  }

  if (typeof value === "string") {
    return parsePossiblyNestedJson(value) ?? value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => expandNestedJsonStrings(item, depth + 1));
  }

  if (!isRecord(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      expandNestedJsonStrings(nestedValue, depth + 1),
    ]),
  );
}

function normalizeUserId(value: unknown): string | null {
  const text = extractString(value)?.trim();

  return text && UUID_PATTERN.test(text) ? text : null;
}

function extractString(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (isRecord(value)) {
    for (const candidateKey of ["id", "userId", "user_id", "sub"]) {
      const candidate = value[candidateKey];
      if (typeof candidate === "string" || typeof candidate === "number") {
        return String(candidate);
      }
    }
  }

  return null;
}

function normalizeObjectKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
