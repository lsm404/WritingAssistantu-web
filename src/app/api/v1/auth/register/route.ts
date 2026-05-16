import { NextRequest, NextResponse } from "next/server";

const upstreamBaseUrl =
  process.env.NODE_BACKEND_URL?.trim() ||
  process.env.API_PROXY_TARGET?.trim() ||
  (process.env.NODE_ENV === "production" ? "http://49.235.172.63:3100" : "http://localhost:3100");

function copyHeader(headers: Headers, name: string) {
  const value = headers.get(name);
  return value ? { [name]: value } : {};
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const response = await fetch(`${upstreamBaseUrl}/api/v1/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": request.headers.get("content-type") || "application/json",
        "X-OpenClaw-Proxy": "web",
        ...copyHeader(request.headers, "x-device-id"),
        ...copyHeader(request.headers, "forwarded"),
        ...copyHeader(request.headers, "x-forwarded-for"),
        ...copyHeader(request.headers, "x-original-forwarded-for"),
        ...copyHeader(request.headers, "x-real-ip"),
        ...copyHeader(request.headers, "x-client-ip"),
        ...copyHeader(request.headers, "x-cluster-client-ip"),
        ...copyHeader(request.headers, "cf-connecting-ip"),
        ...copyHeader(request.headers, "true-client-ip"),
        ...copyHeader(request.headers, "fastly-client-ip"),
        ...copyHeader(request.headers, "user-agent"),
      },
      body,
      cache: "no-store",
    });

    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "UPSTREAM_UNREACHABLE" }, { status: 502 });
  }
}
