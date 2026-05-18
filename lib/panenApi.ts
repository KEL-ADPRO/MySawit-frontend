import { getServiceHeaders } from "./session";

export function getPanenBaseUrl(): string {
    if (process.env.NEXT_PUBLIC_DEBUG === "true") {
        return "http://localhost:8082";
    }
    return "https://mysawit-backend-panen.onrender.com";
}

export async function submitReport(payload: {
    weight: number;
    description?: string;
    photoUrls: string[];
}) {
    const response = await fetch(`${getPanenBaseUrl()}/api/report`, {
        method: "POST",
        headers: getServiceHeaders(),
        body: JSON.stringify(payload),
    });
    return response.json(); 
}

export async function approveReport(reportId: string) {
    const response = await fetch(
        `${getPanenBaseUrl()}/api/report/${reportId}/approve`,
        {
        method: "POST",
        headers: getServiceHeaders(),
        }
    );
    return response.json();
}

export async function rejectReport(reportId: string, rejectionReason: string) {
    const response = await fetch(
        `${getPanenBaseUrl()}/api/report/${reportId}/reject`,
        {
        method: "POST",
        headers: getServiceHeaders(),
        body: JSON.stringify({ rejectionReason }),
        }
    );
    return response.json();
}