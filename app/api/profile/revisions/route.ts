import { NextRequest, NextResponse } from "next/server";

import {
  getProfileEditorState,
  saveProfileDraft,
} from "@/src/features/profile/server/service";
import type { ProfileDraftPayload } from "@/src/features/profile/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await getProfileEditorState();
  return NextResponse.json(state);
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as ProfileDraftPayload;
  const revision = await saveProfileDraft(body);
  const state = await getProfileEditorState();
  return NextResponse.json({ revision, revisions: state.revisions }, { status: 201 });
}
