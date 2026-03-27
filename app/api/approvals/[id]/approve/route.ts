import { NextRequest, NextResponse } from "next/server";

import { approveApprovalRequest } from "@/src/features/approvals/server/service";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { editedText?: string };
  const result = await approveApprovalRequest({ id, editedText: body.editedText });

  if (!result.ok) {
    return NextResponse.json(
      { error: { message: result.error.message } },
      { status: result.error.status || 500 },
    );
  }

  return NextResponse.json({ approval: result.approval, draft: result.draft });
}
