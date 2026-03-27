import { NextResponse } from "next/server";

import {
  createApprovalRequest,
  shouldGateAction,
} from "@/src/features/approvals/server/service";
import { getProfileRevisionById } from "@/src/features/operator-store/server/store";
import {
  applyProfileRevision,
  getProfileEditorState,
} from "@/src/features/profile/server/service";
import { sanitizeApprovalValue } from "@/src/features/approvals/server/sanitize";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const revision = await getProfileRevisionById(id);

  if (!revision) {
    return NextResponse.json(
      { error: { message: "Profile revision not found." } },
      { status: 404 },
    );
  }

  const requiresReview = await shouldGateAction("profile_edit");
  if (requiresReview) {
    const approval = await createApprovalRequest({
      actionType: "profile_edit",
      payload: sanitizeApprovalValue({
        profileRevisionId: revision.id,
        name: revision.name,
        bio: revision.bio,
        url: revision.url,
        location: revision.location,
        avatar_asset_ref: revision.avatar_asset_ref,
        banner_asset_ref: revision.banner_asset_ref,
      }) as Record<string, unknown>,
      reason: "Profile surface changes require approval.",
      priority: "high",
      requestedBy: "operator",
    });
    const state = await getProfileEditorState();
    return NextResponse.json({
      revision,
      revisions: state.revisions,
      approval,
    });
  }

  const result = await applyProfileRevision(revision.id);
  if (!result.ok) {
    return NextResponse.json(
      { error: { message: result.error.message } },
      { status: result.error.status || 500 },
    );
  }

  const state = await getProfileEditorState();
  return NextResponse.json({
    revision: result.revision,
    revisions: state.revisions,
  });
}
