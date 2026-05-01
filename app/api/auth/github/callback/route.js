import crypto from "node:crypto";
import { NextResponse } from "next/server";
import connectDB from "../../../../../lib/mongoose";
import { getAuthCookie, sanitizeUser } from "../../../../../lib/auth";
import { hashPassword } from "../../../../../lib/password";
import User from "../../../../../models/User";

function normalizeUsername(value = "", fallback = "github-user") {
  const normalized = String(value)
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 28);

  return normalized || fallback;
}

async function getUniqueUsername(baseUsername) {
  let username = normalizeUsername(baseUsername);
  let suffix = 0;

  while (await User.exists({ username })) {
    suffix += 1;
    username = `${normalizeUsername(baseUsername).slice(0, 24)}-${suffix}`;
  }

  return username;
}

async function fetchPrimaryEmail(accessToken) {
  const response = await fetch("https://api.github.com/user/emails", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
    },
    cache: "no-store",
  });

  if (!response.ok) return "";

  const emails = await response.json();
  const primary = Array.isArray(emails)
    ? emails.find((email) => email.primary && email.verified) ||
      emails.find((email) => email.verified)
    : null;

  return primary?.email || "";
}

export async function GET(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = req.cookies.get("github_oauth_state")?.value;

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL("/login?oauth=invalid", req.url));
  }

  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    return NextResponse.redirect(new URL("/login?oauth=missing", req.url));
  }

  try {
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
      cache: "no-store",
    });

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData?.access_token;

    if (!accessToken) {
      return NextResponse.redirect(new URL("/login?oauth=failed", req.url));
    }

    const profileResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
      },
      cache: "no-store",
    });

    if (!profileResponse.ok) {
      return NextResponse.redirect(new URL("/login?oauth=failed", req.url));
    }

    const profile = await profileResponse.json();
    const oauthId = String(profile.id || "");

    if (!oauthId) {
      return NextResponse.redirect(new URL("/login?oauth=failed", req.url));
    }

    await connectDB();

    const email =
      profile.email ||
      (await fetchPrimaryEmail(accessToken)) ||
      `${oauthId}+github@egchat.local`;

    let user =
      (await User.findOne({ oauthProvider: "github", oauthId })) ||
      (await User.findOne({ email }));

    if (!user) {
      user = await User.create({
        username: await getUniqueUsername(profile.login || profile.name),
        email,
        password: await hashPassword(crypto.randomBytes(24).toString("hex")),
        avatar: profile.avatar_url || "/avatar.jpg",
        about: profile.bio || "Signed in with GitHub.",
        location: profile.location || "",
        developerName: profile.name || "GitHub user",
        oauthProvider: "github",
        oauthId,
        status: true,
        displayname: "online",
      });
    } else {
      user = await User.findByIdAndUpdate(
        user._id,
        {
          oauthProvider: "github",
          oauthId,
          avatar: user.avatar || profile.avatar_url || "/avatar.jpg",
          location: user.location || profile.location || "",
          status: true,
          displayname: "online",
        },
        { new: true }
      );
    }

    const safeUser = sanitizeUser(user);
    const response = NextResponse.redirect(new URL("/chat", req.url));
    response.headers.append("Set-Cookie", getAuthCookie(safeUser));
    response.cookies.delete("github_oauth_state");

    return response;
  } catch {
    return NextResponse.redirect(new URL("/login?oauth=failed", req.url));
  }
}
