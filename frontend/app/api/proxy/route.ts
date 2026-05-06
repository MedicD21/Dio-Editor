import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
  const { searchParams, pathname } = new URL(request.url);
  const path = pathname.replace("/api/proxy", "");
  const url = `${API_URL}${path}?${searchParams.toString()}`;

  const resp = await fetch(url, { headers: { "Content-Type": "application/json" } });
  const data = await resp.json();
  return NextResponse.json(data, { status: resp.status });
}

export async function POST(request: NextRequest) {
  const { pathname } = new URL(request.url);
  const path = pathname.replace("/api/proxy", "");
  const url = `${API_URL}${path}`;

  const body = await request.text();
  const contentType = request.headers.get("content-type") || "application/json";

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": contentType },
    body,
  });
  const data = await resp.json();
  return NextResponse.json(data, { status: resp.status });
}
