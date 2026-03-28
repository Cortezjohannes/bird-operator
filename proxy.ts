import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { verifySessionToken } from "@/src/features/auth/session";
import {
  APP_SESSION_COOKIE_NAME,
  getAppSessionSecret,
  isTrustedOrigin,
} from "@/src/features/auth/server/config";

const publicPagePaths = new Set(["/login"]);
const publicApiPaths = new Set([
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/session",
  "/api/operator-pairing/request",
  "/api/operator-pairing/status",
  "/api/operator/actions/execute",
  "/api/operator/session",
]);

function isPublicPath(pathname: string) {
  return publicPagePaths.has(pathname) || publicApiPaths.has(pathname);
}

function isIgnoredPath(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/screenshots") ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  );
}

function isMutatingMethod(method: string) {
  return method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";
}

function shouldEnforceOwnerApiOrigin(pathname: string) {
  return pathname.startsWith("/api/") && !pathname.startsWith("/api/operator/");
}

function hasTrustedRequestOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) {
    return false;
  }

  return origin === request.nextUrl.origin || isTrustedOrigin(origin);
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  if (next && next !== "/login") {
    loginUrl.searchParams.set("next", next);
  }
  return NextResponse.redirect(loginUrl);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isIgnoredPath(pathname)) {
    return NextResponse.next();
  }

  const sessionSecret = getAppSessionSecret();
  const token = request.cookies.get(APP_SESSION_COOKIE_NAME)?.value;
  const session = sessionSecret && token
    ? await verifySessionToken(token, sessionSecret)
    : null;

  if (isPublicPath(pathname)) {
    if (pathname === "/login" && session) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: { message: "Authentication required." } },
        { status: 401 },
      );
    }

    return redirectToLogin(request);
  }

  if (session.role !== "owner") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: { message: "Owner role required." } },
        { status: 403 },
      );
    }

    return redirectToLogin(request);
  }

  if (shouldEnforceOwnerApiOrigin(pathname) && isMutatingMethod(request.method)) {
    if (!hasTrustedRequestOrigin(request)) {
      return NextResponse.json(
        { error: { message: "Blocked by same-origin policy." } },
        { status: 403 },
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*).*)", "/api/:path*"],
};
