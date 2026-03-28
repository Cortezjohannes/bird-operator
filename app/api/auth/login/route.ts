import { NextRequest, NextResponse } from "next/server";

import { authenticateOwnerLogin } from "@/src/features/auth/server/login";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { email?: string; password?: string };

  if (!body.email || !body.password) {
    return NextResponse.json(
      { error: { message: "Email and password are required." } },
      { status: 400 },
    );
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  const remoteAddress = forwardedFor?.split(",")[0]?.trim() || "unknown";

  const result = await authenticateOwnerLogin({
    email: body.email,
    password: body.password,
    remoteAddress,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: { message: result.message } },
      { status: result.status },
    );
  }

  return NextResponse.json({ user: result.user });
}
