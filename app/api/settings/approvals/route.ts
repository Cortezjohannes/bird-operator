import { NextRequest, NextResponse } from "next/server";

import { getApprovalPolicy, setApprovalPolicy } from "@/src/features/approvals/server/service";
import type { ApprovalPolicySettings } from "@/src/features/approvals/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getApprovalPolicy();
  return NextResponse.json({ settings });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as ApprovalPolicySettings;
  const settings = await setApprovalPolicy(body);
  return NextResponse.json({ settings });
}
