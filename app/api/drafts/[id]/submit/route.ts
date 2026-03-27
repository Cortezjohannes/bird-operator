import { NextResponse } from "next/server";

import { submitDraftForApproval } from "@/src/features/drafts/server/service";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const draft = await submitDraftForApproval(id);

  if (!draft) {
    return NextResponse.json({ error: { message: "Draft not found." } }, { status: 404 });
  }

  return NextResponse.json({ draft });
}
