import { NextRequest, NextResponse } from "next/server";

import { addAuthorToWatchlist } from "@/src/features/operator-store/server/store";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    userHandle?: string;
    userName?: string;
  };

  if (!body.userHandle || !body.userName) {
    return NextResponse.json(
      { error: { message: "Invalid watchlist payload." } },
      { status: 400 },
    );
  }

  const record = await addAuthorToWatchlist(body.userHandle, body.userName);
  return NextResponse.json({ record });
}
