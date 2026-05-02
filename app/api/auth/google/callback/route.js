import crypto from "node:crypto";
import { NextResponse } from "next/server";
import connectDB from "../../../../../lib/mongoose";
import { getAuthCookie, sanitizeUser } from "../../../../../lib/auth";
import { hashPassword } from "../../../../../lib/password";
import User from "../../../../../models/User";

function normalizeUsername(value = "", fallback = "google-user") {
  const normalized = String(value)
    .toLowerCase()
    .replace(/@.*/, "")
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 28);

  return normalized || fallback;
}

async function getUniqueUsername(baseUsername) {
  const base = normalizeUsername(baseUsername);
  let username = base;
  let suffix = 0;

  while (await User.exists({ username })) {
    suffix += 1;
    username = `${base.slice(0, 24)}-${suffix}`;
  }

  return username;
}

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
    const redirectUri = new URL("/api/auth/google/callback", baseUrl).toString();
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

    let user =
      (await User.findOne({ oauthProvider: "google", oauthId })) ||
      (await User.findOne({ email }));

    if (!user) {
      user = await User.create({
        username: await getUniqueUsername(email || profile.name),
        email,
        password: await hashPassword(crypto.randomBytes(24).toString("hex")),
        avatar: profile.picture || "/avatar.jpg",
        about: "Signed in with Google.",
        developerName: profile.name || "Google user",
        oauthProvider: "google",
        oauthId,
        status: true,
        displayname: "online",
      });
    } else {
      user = await User.findByIdAndUpdate(
        user._id,
        {
          oauthProvider: "google",
          oauthId,
          avatar: user.avatar || profile.picture || "/avatar.jpg",
          developerName: user.developerName || profile.name || "Google user",
          status: true,
          displayname: "online",
        },
        { returnDocument: "after" }
      );
    }

    const safeUser = sanitizeUser(user);
    const response = NextResponse.redirect(new URL("/posts", baseUrl));
    response.headers.append("Set-Cookie", getAuthCookie(safeUser));
    response.cookies.delete("google_oauth_state");

    return response;
  } catch {
    return NextResponse.redirect(new URL("/login?oauth=failed", baseUrl));
  }
}
