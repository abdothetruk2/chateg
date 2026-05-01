import crypto from "node:crypto";
import { NextResponse } from "next/server";

function getBaseUrl(req) {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;

  const url = new URL(req.url);
  if (url.hostname === "0.0.0.0") {
    url.hostname = "localhost";
  }

  return url.origin;
}

export async function GET(req) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const baseUrl = getBaseUrl(req);

  if (!clientId) {
    return NextResponse.redirect(new URL("/login?oauth=google-missing", baseUrl));
  }

  const callbackUrl = new URL("/api/auth/google/callback", baseUrl);
  const state = crypto.randomBytes(16).toString("hex");
  const authorizeUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", callbackUrl.toString());
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", "openid email profile");
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("prompt", "select_account");

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  return response;
}
