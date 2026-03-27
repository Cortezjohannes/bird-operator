import { NextResponse } from "next/server";

import { rejectApprovalRequest } from "@/src/features/approvals/server/service";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const approval = await rejectApprovalRequest(id);

  if (!approval) {
    return NextResponse.json({ error: { message: "Approval not found." } }, { status: 404 });
  }

  return NextResponse.json({ approval });
}
