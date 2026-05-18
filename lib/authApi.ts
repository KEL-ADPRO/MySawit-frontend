import { getAuthHeaders } from "./session";

export function getAuthBaseUrl(): string {
    if (process.env.NEXT_PUBLIC_DEBUG === "true") {
        return "http://localhost:8081";
    }
    return "https://mysawit-backend-auth.onrender.com";
}

export async function fetchMe() {
    const response = await fetch(`${getAuthBaseUrl()}/api/auth/me`, {
        method: "GET",
        headers: getAuthHeaders(),
    });
    response.json();
}

export async function logout() {
    const response = await fetch(`${getAuthBaseUrl()}/api/auth/logout`, {
        method: "POST",
        headers: getAuthHeaders(),
    });
    return response.json();
}