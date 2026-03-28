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
  if (body.browserFallbackEnabled) {
    return NextResponse.json(
      {
        error: {
          message:
            "Browser fallback is not shipped in this product build. Install a reviewed fallback executor before enabling it.",
        },
      },
      { status: 409 },
    );
  }
  const settings = await setExecutionSettings({
    browserFallbackEnabled: Boolean(body.browserFallbackEnabled),
  });
  return NextResponse.json({ settings });
}
