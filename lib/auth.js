export const AUTH_COOKIE_NAME = "user";
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export function sanitizeUser(user) {
  if (!user) return null;

  const safeUser = typeof user.toObject === "function" ? user.toObject() : { ...user };
  const provider = safeUser.provider || safeUser.oauthProvider || "local";

  return {
    _id: String(safeUser._id || ""),
    username: safeUser.username || "",
    email: safeUser.email || "",
    avatar: safeUser.avatar || "/avatar.jpg",
    coverPhoto: safeUser.coverPhoto || "",
    about: safeUser.about || "",
    jobTitle: safeUser.jobTitle || "",
    location: safeUser.location || "",
    developerName: safeUser.developerName || "",
    themeMode: safeUser.themeMode || "dark",
    themeColor: safeUser.themeColor || "Cyan",
    messageSounds:
      typeof safeUser.messageSounds === "boolean" ? safeUser.messageSounds : true,
    callRingtone:
      typeof safeUser.callRingtone === "boolean" ? safeUser.callRingtone : true,
    status: Boolean(safeUser.status),
    displayname: safeUser.displayname || "offline",
    createdAt: safeUser.createdAt || "",
    provider,
  };
}

export function getUserCookieValue(user) {
  return encodeURIComponent(JSON.stringify(sanitizeUser(user)));
}

export function getAuthCookie(user, options = {}) {
  const maxAge =
    typeof options.maxAge === "number" ? options.maxAge : AUTH_COOKIE_MAX_AGE;
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";

  return [
    `${AUTH_COOKIE_NAME}=${getUserCookieValue(user)}`,
    "Path=/",
    `Max-Age=${maxAge}`,
    "SameSite=Lax",
    secure,
  ]
    .filter(Boolean)
    .join("; ");
}

export function getAuthCookieOptions(options = {}) {
  return {
    path: "/",
    maxAge:
      typeof options.maxAge === "number" ? options.maxAge : AUTH_COOKIE_MAX_AGE,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  };
}

export function setAuthCookie(response, user, options = {}) {
  response.cookies.set(
    AUTH_COOKIE_NAME,
    JSON.stringify(sanitizeUser(user)),
    getAuthCookieOptions(options)
  );

  return response;
}

export function clearAuthCookie(response) {
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    ...getAuthCookieOptions({ maxAge: 0 }),
    expires: new Date(0),
  });

  return response;
}

export function getRequestUser(req) {
  const rawCookie = req?.cookies?.get?.(AUTH_COOKIE_NAME)?.value;
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
