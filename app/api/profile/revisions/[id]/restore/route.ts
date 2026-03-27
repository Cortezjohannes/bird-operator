import { NextResponse } from "next/server";

import {
  getProfileEditorState,
  restoreProfileRevisionToDraft,
} from "@/src/features/profile/server/service";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const revision = await restoreProfileRevisionToDraft(id);

  if (!revision) {
    return NextResponse.json(
      { error: { message: "Profile revision not found." } },
      { status: 404 },
    );
  }

  const state = await getProfileEditorState();
  return NextResponse.json({ revision, revisions: state.revisions });
}
