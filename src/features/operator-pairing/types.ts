import type { XCapability } from "@/src/features/x-auth/types";

export type OperatorPairingRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "expired"
  | "revoked";

export type OperatorSessionStatus = "active" | "revoked" | "expired";
export type OperatorSessionMode =
  | "approval_required"
  | "trusted_operator"
  | "custom";

export interface OperatorSessionActivitySummary {
  id: string;
  timestamp: string;
  actionType: string;
  resultStatus: "success" | "failed" | "queued" | "skipped";
  resultExcerpt: string;
  executionPath: "direct" | "approval_gated" | "auto_executed" | "owner_only_blocked" | null;
}

export interface OperatorFingerprintMetadata {
  host?: string;
  instanceId?: string;
  runtime?: string;
  ipHint?: string;
  notes?: string;
}

export interface OperatorPairingRequest {
  id: string;
  status: OperatorPairingRequestStatus;
  created_at: string;
  expires_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  revoked_at: string | null;
  operator_instance_id: string;
  operator_label: string;
  operator_fingerprint: OperatorFingerprintMetadata;
  requested_capabilities: XCapability[];
  requested_scope_summary: string;
  one_time_code_hash: string;
  one_time_code_display: string;
  approval_link_token_hash: string;
  poll_token_hash: string;
  approved_by_user_id: string | null;
  connected_x_account_id: string | null;
  operator_session_id: string | null;
  session_token_claimed_at: string | null;
}

export interface OperatorSession {
  id: string;
  operator_instance_id: string;
  operator_label: string;
  fingerprint_metadata: OperatorFingerprintMetadata;
  connected_x_account_id: string;
  paired_by_user_id: string;
  requested_capabilities: XCapability[];
  mode: OperatorSessionMode;
  granted_capabilities: XCapability[];
  approval_required_capabilities: XCapability[];
  status: OperatorSessionStatus;
  paired_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  last_seen_at: string | null;
  lease_token_hash: string | null;
}

export interface PairingRequestSummary {
  id: string;
  status: OperatorPairingRequestStatus;
  createdAt: string;
  expiresAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  revokedAt: string | null;
  operatorInstanceId: string;
  operatorLabel: string;
  operatorFingerprint: OperatorFingerprintMetadata;
  requestedCapabilities: XCapability[];
  requestedScopeSummary: string;
  oneTimeCodeDisplay: string;
  approvedByUserId: string | null;
  connectedXAccountId: string | null;
  operatorSessionId: string | null;
}

export interface OperatorSessionSummary {
  id: string;
  operatorInstanceId: string;
  operatorLabel: string;
  fingerprintMetadata: OperatorFingerprintMetadata;
  connectedXAccountId: string;
  pairedByUserId: string;
  requestedCapabilities: XCapability[];
  mode: OperatorSessionMode;
  grantedCapabilities: XCapability[];
  approvalRequiredCapabilities: XCapability[];
  status: OperatorSessionStatus;
  pairedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  lastSeenAt: string | null;
  recentActions: OperatorSessionActivitySummary[];
}

export interface CreatePairingRequestInput {
  operatorInstanceId: string;
  operatorLabel: string;
  operatorFingerprint: OperatorFingerprintMetadata;
  requestedCapabilities: XCapability[];
  requestedScopeSummary?: string;
}

export interface PairingCreationResponse {
  requestId: string;
  expiresAt: string;
  oneTimeCode: string;
  approvalUrl: string;
  pollToken: string;
}

export interface PairingResolutionPayload {
  request: PairingRequestSummary | null;
  matchedBy: "approval_link" | "code" | null;
}

export interface OperatorSessionPolicyInput {
  mode: OperatorSessionMode;
  grantedCapabilities: XCapability[];
  approvalRequiredCapabilities?: XCapability[];
  expiresAt?: string | null;
}
