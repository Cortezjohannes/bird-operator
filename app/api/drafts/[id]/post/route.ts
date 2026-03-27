import { NextResponse } from "next/server";

import { postDraftNow } from "@/src/features/drafts/server/service";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await postDraftNow(id);

  if (!result.ok) {
    return NextResponse.json(
      { error: { message: result.error.message } },
      { status: result.error.status || 500 },
    );
  }

  return NextResponse.json({
    draft: result.draft,
    approval: "approval" in result ? result.approval : null,
  });
}
