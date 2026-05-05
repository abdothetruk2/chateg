import { NextResponse } from "next/server";

const publicApiRoutes = [
  "/api/auth/callback/google",
  "/api/auth/google",
  "/api/auth/google/callback",
  "/api/demo-login",
  "/api/health",
  "/api/login",
  "/api/register",
];

const publicApiPrefixes = ["/api/media/"];

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
