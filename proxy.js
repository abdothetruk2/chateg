import { NextResponse } from "next/server";

const publicApiRoutes = [
  "/api/auth/callback/google",
  "/api/auth/google",
  "/api/auth/google/callback",
  "/api/demo-login",
  "/api/health",
  "/api/login",
  "/api/logout",
  "/api/register",
  "/api/twilio-voice",
];

const publicApiPrefixes = ["/api/media/"];

const bearerApiRoutes = [
  "/api/prescription-reader",
  "/api/prescription-validate",
  "/api/v1/prescription/extract",
  "/api/v1/prescription/validate",
];

export function proxy(request) {
  const { pathname } = request.nextUrl;

  if (
    request.method === "OPTIONS" ||
    publicApiRoutes.some((route) => pathname === route) ||
    publicApiPrefixes.some((route) => pathname.startsWith(route))
  ) {
    return NextResponse.next();
  }

  const hasUserCookie = Boolean(request.cookies.get("user")?.value);
  const hasBearerToken = /^Bearer\s+\S+/i.test(
    request.headers.get("authorization") || ""
  );

  if (
    bearerApiRoutes.some((route) => pathname === route) &&
    (hasUserCookie || hasBearerToken)
  ) {
    return NextResponse.next();
  }

  if (!hasUserCookie) {
    return NextResponse.json(
      { message: "Authentication required" },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
