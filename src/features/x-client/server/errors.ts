import "server-only";

import { sanitizeErrorMessage } from "@/src/features/x-auth/server/sanitize";
import type { XAuthMethod } from "@/src/features/x-auth/types";
import type { XLogEntry, XNormalizedError } from "@/src/features/x-client/types";

export function createNormalizedError(input: {
  code: string;
  status: number;
  endpointLabel: string;
  authStrategy: XAuthMethod;
  message: string;
  safeExcerpt?: string;
}): XNormalizedError {
  return {
    code: input.code,
    status: input.status,
    endpointLabel: input.endpointLabel,
    authStrategy: input.authStrategy,
    message: sanitizeErrorMessage(input.message),
    safeExcerpt: sanitizeErrorMessage(input.safeExcerpt || input.message),
  };
}

export function createLogEntry(input: {
  mode: "unavailable" | "live";
  operation: string;
  endpointLabel: string;
  authStrategy: XAuthMethod;
  success: boolean;
  status: number;
  message: string;
}): XLogEntry {
  return {
    id: `log-${Math.random().toString(36).slice(2, 10)}`,
    timestamp: new Date().toISOString(),
    mode: input.mode,
    operation: input.operation,
    endpointLabel: input.endpointLabel,
    authStrategy: input.authStrategy,
    success: input.success,
    status: input.status,
    message: sanitizeErrorMessage(input.message),
  };
}
