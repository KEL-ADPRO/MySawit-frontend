import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const { searchParams } = new URL(req.url);
    const msg = searchParams.get("msg") ?? "hello";

    const base = process.env.PEMBAYARAN_BACKEND_URL ?? "http://localhost:8085";
    const res = await fetch(`${base}/api/db-ping?msg=${encodeURIComponent(msg)}`, {
        method: "POST",
        cache: "no-store",
    });

    const body = await res.text();
    return new NextResponse(body, {
        status: res.status,
        headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
    });
}