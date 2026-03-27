import { NextRequest, NextResponse } from "next/server";

import { createDraft, getDrafts } from "@/src/features/drafts/server/service";
import type { DraftPayload } from "@/src/features/drafts/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const drafts = await getDrafts();
  return NextResponse.json({ drafts });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as DraftPayload;

  if (!body.type) {
    return NextResponse.json(
      { error: { message: "Draft type is required." } },
      { status: 400 },
    );
  }

  const draft = await createDraft(body);
  return NextResponse.json({ draft }, { status: 201 });
}
