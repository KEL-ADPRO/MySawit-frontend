import Cookies from "js-cookie";

const TOKEN_KEY = "ms_token";
const USER_ID_KEY = "ms_user_id";
const ROLE_KEY = "ms_role";
const NAME_KEY = "ms_name";

const COOKIE_OPTIONS: Cookies.CookieAttributes = {
    expires: 1, 
    sameSite: "Strict",
    secure: process.env.NODE_ENV === "production",
};

export interface Session {
    token: string;
    userId: string;
    role: string;
    name: string;
}

export function saveSession(session: Session): void {
    Cookies.set(TOKEN_KEY, session.token, COOKIE_OPTIONS);
    Cookies.set(USER_ID_KEY, session.userId, COOKIE_OPTIONS);
    Cookies.set(ROLE_KEY, session.role, COOKIE_OPTIONS);
    Cookies.set(NAME_KEY, session.name, COOKIE_OPTIONS);
}

export function getSession(): Session | null {
    const token = Cookies.get(TOKEN_KEY);
    const userId = Cookies.get(USER_ID_KEY);
    const role = Cookies.get(ROLE_KEY);
    const name = Cookies.get(NAME_KEY);

    if (!token || !userId || !role) return null;

    return { token, userId, role, name: name ?? "" };
}

export function clearSession(): void {
    Cookies.remove(TOKEN_KEY);
    Cookies.remove(USER_ID_KEY);
    Cookies.remove(ROLE_KEY);
    Cookies.remove(NAME_KEY);
}

export function getAuthHeaders(): HeadersInit {
    const session = getSession();
    if (!session) return { "Content-Type": "application/json" };
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
  };
}

export function getServiceHeaders(): HeadersInit {
    const session = getSession();
    if (!session) return { "Content-Type": "application/json" };
    return {
        "Content-Type": "application/json",
        "X-User-Id": session.userId,
    };
}