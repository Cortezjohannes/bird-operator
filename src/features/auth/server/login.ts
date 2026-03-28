import "server-only";

import { getAuthSetupState, getOwnerEmail, getOwnerPasswordHash } from "@/src/features/auth/server/config";
import { setAppSession } from "@/src/features/auth/server/current-session";
import { recordActionLog } from "@/src/features/logs/server/service";
import { verifyPasswordHash } from "@/src/features/auth/server/password";
import { consumeLoginAttempt, resetLoginAttempts } from "@/src/features/auth/server/rate-limit";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export async function authenticateOwnerLogin(input: {
  email: string;
  password: string;
  remoteAddress: string;
}) {
  const setupState = getAuthSetupState();
  if (!setupState.configured) {
    await recordActionLog({
      actor: "system",
      actionType: "auth.login",
      targetType: "system",
      payloadSummary: "Owner login attempted before auth setup completed.",
      resultStatus: "failed",
      resultExcerpt: "App authentication is not configured.",
      authMethod: "system",
    });
    return {
      ok: false as const,
      status: 503,
      message: "App authentication is not configured yet.",
    };
  }

  const normalizedEmail = normalizeEmail(input.email);
  const limit = consumeLoginAttempt(input.remoteAddress || "unknown");
  if (!limit.allowed) {
    await recordActionLog({
      actor: normalizedEmail || "unknown",
      actionType: "auth.login",
      targetType: "system",
      payloadSummary: "Owner login attempt rate limited.",
      resultStatus: "failed",
      resultExcerpt: `Rate limited for ${limit.retryAfterSeconds}s.`,
      authMethod: "system",
    });
    return {
      ok: false as const,
      status: 429,
      message: `Too many login attempts. Try again in ${limit.retryAfterSeconds}s.`,
    };
  }

  if (normalizedEmail !== getOwnerEmail()) {
    await recordActionLog({
      actor: normalizedEmail || "unknown",
      actionType: "auth.login",
      targetType: "system",
      payloadSummary: "Owner login failed.",
      resultStatus: "failed",
      resultExcerpt: "Invalid email or password.",
      authMethod: "system",
    });
    return {
      ok: false as const,
      status: 401,
      message: "Invalid email or password.",
    };
  }

  const valid = await verifyPasswordHash(input.password, getOwnerPasswordHash());
  if (!valid) {
    await recordActionLog({
      actor: normalizedEmail,
      actionType: "auth.login",
      targetType: "system",
      payloadSummary: "Owner login failed.",
      resultStatus: "failed",
      resultExcerpt: "Invalid email or password.",
      authMethod: "system",
    });
    return {
      ok: false as const,
      status: 401,
      message: "Invalid email or password.",
    };
  }

  resetLoginAttempts(input.remoteAddress || "unknown");

  await setAppSession({
    id: "owner-user",
    email: normalizedEmail,
    role: "owner",
  });

  await recordActionLog({
    actor: normalizedEmail,
    actionType: "auth.login",
    targetType: "system",
    payloadSummary: "Owner session established.",
    resultStatus: "success",
    resultExcerpt: "Owner signed in successfully.",
    authMethod: "system",
  });

  return {
    ok: true as const,
    user: {
      id: "owner-user",
      email: normalizedEmail,
      role: "owner" as const,
    },
  };
}
