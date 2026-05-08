import { NextRequest, NextResponse } from "next/server";

const DEFAULT_KEBUN_BACKEND_URL =
  process.env.KEBUN_API_URL ??
  process.env.NEXT_PUBLIC_KEBUN_API_URL ??
  "https://mysawit-backend-manage-lahan-2be2712d124d.herokuapp.com";

async function proxy(request: NextRequest, pathSegments: string[] = []) {
  const url = new URL(request.url);
  const target = new URL(`${DEFAULT_KEBUN_BACKEND_URL.replace(/\/$/, "")}/api/kebun`);

  if (pathSegments.length > 0) {
    target.pathname = `${target.pathname}/${pathSegments
      .map((segment) => encodeURIComponent(segment))
      .join("/")}`;
  }

  target.search = url.search;

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }

  const userRole = request.headers.get("x-user-role");
  if (userRole) {
    headers.set("x-user-role", userRole);
  }

  const userId = request.headers.get("x-user-id");
  if (userId) {
    headers.set("x-user-id", userId);
  }

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: "no-store",
  };

  if (!['GET', 'HEAD'].includes(request.method)) {
    init.body = await request.text();
  }

  const response = await fetch(target.toString(), init);
  const body = await response.text();

  return new NextResponse(body, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/json",
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const resolvedParams = await params;
  return proxy(request, resolvedParams.path ?? []);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const resolvedParams = await params;
  return proxy(request, resolvedParams.path ?? []);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const resolvedParams = await params;
  return proxy(request, resolvedParams.path ?? []);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const resolvedParams = await params;
  return proxy(request, resolvedParams.path ?? []);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const resolvedParams = await params;
  return proxy(request, resolvedParams.path ?? []);
}
