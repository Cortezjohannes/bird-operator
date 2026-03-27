import "server-only";

import { sanitizeErrorMessage } from "@/src/features/x-auth/server/sanitize";

const blockedKeyPattern =
  /(secret|token|cookie|authorization|auth_header|refresh|password|bearer)/i;

export function sanitizeApprovalValue(value: unknown): unknown {
  if (typeof value === "string") {
    return sanitizeErrorMessage(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeApprovalValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [
        key,
        blockedKeyPattern.test(key)
          ? "[redacted]"
          : sanitizeApprovalValue(entryValue),
      ]),
    );
  }

  return value;
}
