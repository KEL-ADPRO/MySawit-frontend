import { NextResponse } from "next/server";

export async function GET() {
    const base = process.env.PEMBAYARAN_BACKEND_URL ?? "http://localhost:8085";
    const res = await fetch(`${base}/api/db-ping/count`, { cache: "no-store" });
    const body = await res.text();

    return new NextResponse(body, {
        status: res.status,
        headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
    });
}