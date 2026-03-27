import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { tweetId?: string; text?: string };
  if (!body.tweetId || !body.text) {
    return NextResponse.json({ error: { message: "Missing draft payload." } }, { status: 400 });
  }

  return NextResponse.json({
    result: {
      draftType: "reply",
      tweetId: body.tweetId,
      text: body.text,
      status: "queued_draft",
    },
  });
}
