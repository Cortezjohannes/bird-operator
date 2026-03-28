import { NextRequest, NextResponse } from "next/server";

import { createXConnectUrl } from "@/src/features/x-auth/server/oauth-flow";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const result = await createXConnectUrl();
  if (!result.ok) {
    const url = new URL("/settings/auth", request.url);
    url.searchParams.set("error", result.error);
    return NextResponse.redirect(url);
  }

  return NextResponse.redirect(result.url);
}
