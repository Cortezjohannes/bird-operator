import { capabilityLabels } from "@/src/features/x-auth/capabilities";
import type { XCapability } from "@/src/features/x-auth/types";
import type { OperatorSessionMode } from "@/src/features/operator-pairing/types";

export const operatorSessionModeOrder: OperatorSessionMode[] = [
  "approval_required",
  "trusted_operator",
  "custom",
];

export const operatorSessionModeLabels: Record<OperatorSessionMode, string> = {
  approval_required: "Approval Mode",
  trusted_operator: "Trusted Operator Mode",
  custom: "Custom Mode",
};

export const operatorSessionModeDescriptions: Record<OperatorSessionMode, string> = {
  approval_required:
    "Risky actions still route through the approval lane. Read access and non-gated actions can run normally within granted scope.",
  trusted_operator:
    "The operator can execute granted actions immediately through the app backend without per-action approval.",
  custom:
    "Choose granted capabilities and mark which of them should still require approval for this session.",
};

export const safeDefaultOperatorCapabilities: XCapability[] = [
  "read_timeline",
  "read_mentions",
  "analytics_read",
];

export function getDefaultGrantedCapabilities(requestedCapabilities: XCapability[]) {
  const requested = new Set(requestedCapabilities);
  return safeDefaultOperatorCapabilities.filter((capability) => requested.has(capability));
}

export function formatCapabilityLabel(capability: XCapability) {
  return capabilityLabels[capability];
}
