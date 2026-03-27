import { NextResponse } from "next/server";

import { getProfileEditorState } from "@/src/features/profile/server/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await getProfileEditorState();
  return NextResponse.json(state);
}
