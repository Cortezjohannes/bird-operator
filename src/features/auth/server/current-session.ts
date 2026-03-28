import "server-only";

import { cookies } from "next/headers";

import { createSessionToken, verifySessionToken } from "@/src/features/auth/session";
import {
  APP_SESSION_COOKIE_NAME,
  getAppSessionSecret,
  getSessionTtlSeconds,
  isSecureCookieEnvironment,
} from "@/src/features/auth/server/config";
import type { AppSessionPayload, AppSessionUser } from "@/src/features/auth/types";

export async function getCurrentSession() {
  const secret = getAppSessionSecret();
  if (!secret) {
    return null;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(APP_SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  const payload = await verifySessionToken(token, secret);
  if (!payload) {
    return null;
  }

  const user: AppSessionUser = {
    id: payload.id,
    email: payload.email,
    role: payload.role,
  };

  return {
    user,
    expiresAt: payload.exp,
  };
}

export async function setAppSession(user: AppSessionUser) {
  const secret = getAppSessionSecret();
  if (!secret) {
    throw new Error("App session secret is not configured.");
  }

  const maxAge = getSessionTtlSeconds();
  const now = Math.floor(Date.now() / 1000);
  const payload: AppSessionPayload = {
    ...user,
    iat: now,
    exp: now + maxAge,
  };

  const token = await createSessionToken(payload, secret);
  const cookieStore = await cookies();
  cookieStore.set(APP_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureCookieEnvironment(),
    path: "/",
    maxAge,
  });

  return payload;
}

export async function clearAppSession() {
  const cookieStore = await cookies();
  cookieStore.set(APP_SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureCookieEnvironment(),
    path: "/",
    maxAge: 0,
  });
}

export function isOwnerSession(
  session: Awaited<ReturnType<typeof getCurrentSession>> | null,
) {
  return Boolean(session && session.user.role === "owner");
}

export async function requireCurrentOwnerSession() {
  const session = await getCurrentSession();
  if (!session || session.user.role !== "owner") {
    throw new Error("Owner session is required.");
  }

  return session;
}
