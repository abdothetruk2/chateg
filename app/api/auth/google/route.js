import crypto from "node:crypto";
import { NextResponse } from "next/server";
import connectDB from "../../../../lib/mongoose";
import { sanitizeUser } from "../../../../lib/auth";
import { findOrCreateGoogleUser } from "../../../../lib/googleAuth";
import { ensurePublicRoomIncludesUser } from "../../../../lib/publicRoom";

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
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const baseUrl = getBaseUrl(req);

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/login?oauth=google-missing", baseUrl));
  }

  const callbackUrl = new URL("/api/auth/callback/google", baseUrl);
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

export async function POST(req) {
  try {
    const body = await req.json();

    await connectDB();

    const user = await findOrCreateGoogleUser({
      email: body?.email,
      name: body?.name,
      picture: body?.picture,
    });

    await ensurePublicRoomIncludesUser(user._id);

    return NextResponse.json({
      success: true,
      user: sanitizeUser(user),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Google login failed.",
      },
      { status: error.status || 500 }
    );
  }
}
