import { NextRequest } from "next/server";

const backendBase = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

async function proxyBackend(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const endpoint = `/${path.join("/")}`;
  const target = new URL(endpoint, backendBase);
  target.search = request.nextUrl.search;

  const init: RequestInit = {
    method: request.method,
    headers: {
      accept: "application/json",
    },
    cache: "no-store",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text();
    init.headers = {
      ...init.headers,
      "content-type": request.headers.get("content-type") ?? "application/json",
    };
  }

  try {
    const response = await fetch(target, init);
    const body = await response.text();

    return new Response(body, {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (error) {
    return Response.json(
      {
        detail: error instanceof Error ? error.message : "Backend proxy failed",
        endpoint,
      },
      { status: 502 },
    );
  }
}

export const GET = proxyBackend;
export const POST = proxyBackend;
