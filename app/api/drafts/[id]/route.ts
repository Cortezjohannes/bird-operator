import { NextRequest, NextResponse } from "next/server";

import { deleteDraft, updateDraft } from "@/src/features/drafts/server/service";
import type { DraftPayload } from "@/src/features/drafts/types";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as Partial<DraftPayload>;
  const draft = await updateDraft(id, body);

  if (!draft) {
    return NextResponse.json({ error: { message: "Draft not found." } }, { status: 404 });
  }

  return NextResponse.json({ draft });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const draft = await deleteDraft(id);

  if (!draft) {
    return NextResponse.json({ error: { message: "Draft not found." } }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
