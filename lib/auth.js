export function sanitizeUser(user) {
  if (!user) return null;

  const safeUser = typeof user.toObject === "function" ? user.toObject() : { ...user };
  const provider = safeUser.provider || safeUser.oauthProvider || "local";

  return {
    _id: String(safeUser._id || ""),
    username: safeUser.username || "",
    email: safeUser.email || "",
    avatar: safeUser.avatar || "/avatar.jpg",
    provider,
  };
}

export function getUserCookieValue(user) {
  return encodeURIComponent(JSON.stringify(sanitizeUser(user)));
}

export function getAuthCookie(user, options = {}) {
  const maxAge = options.maxAge || 60 * 60 * 24 * 14;
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";

  return [
    `user=${getUserCookieValue(user)}`,
    "Path=/",
    `Max-Age=${maxAge}`,
    "SameSite=Lax",
    secure,
  ]
    .filter(Boolean)
    .join("; ");
}

export function getRequestUser(req) {
  const rawCookie = req?.cookies?.get?.("user")?.value;
  if (!rawCookie) return null;

  try {
    return JSON.parse(decodeURIComponent(rawCookie));
  } catch {
    try {
      return JSON.parse(rawCookie);
    } catch {
      return null;
    }
  }
}
