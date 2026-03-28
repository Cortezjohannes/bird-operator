import { NextRequest, NextResponse } from "next/server";

import { handleXOAuthCallback } from "@/src/features/x-auth/server/oauth-flow";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const result = await handleXOAuthCallback({
    code: request.nextUrl.searchParams.get("code"),
    state: request.nextUrl.searchParams.get("state"),
    error: request.nextUrl.searchParams.get("error"),
  });

  const destination = new URL("/settings/auth", request.url);
  if (!result.ok) {
    destination.searchParams.set("error", result.message);
  } else {
    destination.searchParams.set("connected", result.username);
  }

  return NextResponse.redirect(destination);
}
