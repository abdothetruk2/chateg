import { NextResponse } from "next/server";
import connectDB from "../../../../../lib/mongoose";
import { getAuthCookie, sanitizeUser } from "../../../../../lib/auth";
import { findOrCreateGoogleUser } from "../../../../../lib/googleAuth";
import { ensurePublicRoomIncludesUser } from "../../../../../lib/publicRoom";

function getBaseUrl(req) {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;

  const url = new URL(req.url);
  if (url.hostname === "0.0.0.0") {
    url.hostname = "localhost";
  }

  return url.origin;
}

export async function GET(req) {
  const url = new URL(req.url);
  const baseUrl = getBaseUrl(req);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = req.cookies.get("google_oauth_state")?.value;

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL("/login?oauth=invalid", baseUrl));
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(new URL("/login?oauth=google-missing", baseUrl));
  }

  try {
    const redirectUri = new URL(url.pathname, baseUrl).toString();
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
      cache: "no-store",
    });

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData?.access_token;

    if (!accessToken) {
      return NextResponse.redirect(new URL("/login?oauth=failed", baseUrl));
    }

    const profileResponse = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }
    );

    if (!profileResponse.ok) {
      return NextResponse.redirect(new URL("/login?oauth=failed", baseUrl));
    }

    const profile = await profileResponse.json();
    const oauthId = String(profile.sub || "");
    const email = String(profile.email || "").toLowerCase();

    if (!oauthId || !email) {
      return NextResponse.redirect(new URL("/login?oauth=failed", baseUrl));
    }

    await connectDB();

    const user = await findOrCreateGoogleUser({
      email,
      name: profile.name,
      picture: profile.picture,
      oauthId,
    });

    await ensurePublicRoomIncludesUser(user._id);

    const safeUser = sanitizeUser(user);
    const response = NextResponse.redirect(new URL("/post", baseUrl));
    response.headers.append(
      "Set-Cookie",
      getAuthCookie(safeUser, { maxAge: 60 * 60 * 24 * 7 })
    );
    response.cookies.delete("google_oauth_state");

    return response;
  } catch {
    return NextResponse.redirect(new URL("/login?oauth=failed", baseUrl));
  }
}
