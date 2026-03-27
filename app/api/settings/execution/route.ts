import { NextRequest, NextResponse } from "next/server";

import {
  getExecutionSettingsSnapshot,
  setExecutionSettings,
} from "@/src/features/execution/server/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getExecutionSettingsSnapshot();
  return NextResponse.json({ settings });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { browserFallbackEnabled?: boolean };
  const settings = await setExecutionSettings({
    browserFallbackEnabled: Boolean(body.browserFallbackEnabled),
  });
  return NextResponse.json({ settings });
}
