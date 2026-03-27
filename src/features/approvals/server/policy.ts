import type {
  ApprovalActionType,
  ApprovalPolicySettings,
  ApprovalPreset,
} from "@/src/features/approvals/types";

export const sensitiveActionTypes: ApprovalActionType[] = [
  "post_tweet",
  "reply_tweet",
  "quote_tweet",
  "thread_post",
  "follow_user",
  "profile_edit",
  "delete_tweet",
];

const presetPolicies: Record<ApprovalPreset, Record<ApprovalActionType, boolean>> = {
  manual: {
    post_tweet: true,
    reply_tweet: true,
    quote_tweet: true,
    thread_post: true,
    follow_user: true,
    profile_edit: true,
    delete_tweet: true,
  },
  semi_auto: {
    post_tweet: true,
    reply_tweet: true,
    quote_tweet: true,
    thread_post: true,
    follow_user: false,
    profile_edit: true,
    delete_tweet: true,
  },
  operator_mode: {
    post_tweet: false,
    reply_tweet: false,
    quote_tweet: false,
    thread_post: false,
    follow_user: false,
    profile_edit: false,
    delete_tweet: false,
  },
};

export function defaultApprovalPolicy(): ApprovalPolicySettings {
  return {
    preset: "manual",
    actionOverrides: {},
  };
}

export function requiresApproval(
  actionType: ApprovalActionType,
  policy: ApprovalPolicySettings,
) {
  const override = policy.actionOverrides[actionType];
  if (typeof override === "boolean") {
    return override;
  }

  return presetPolicies[policy.preset][actionType];
}
