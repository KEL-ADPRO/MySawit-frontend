import { NextResponse } from "next/server";

export async function GET() {
    const base = process.env.NEXT_PUBLIC_PEMBAYARAN_API_URL ?? "https://mysawit-backend-manage-pembayaran.onrender.com";
    const res = await fetch(`${base}/api/db-ping/count`, { cache: "no-store" });
    const body = await res.text();

    return new NextResponse(body, {
        status: res.status,
        headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
    });
}
