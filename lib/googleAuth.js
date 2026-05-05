import User from "../models/User";

export function normalizeGoogleEmail(email = "") {
  return String(email).trim().toLowerCase();
}

export function isValidEmail(email = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function normalizeUsername(value = "", fallback = "google-user") {
  const normalized = String(value)
    .toLowerCase()
    .replace(/@.*/, "")
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 28);

  return normalized || fallback;
}

function getUsernameBase(email, name) {
  const emailName = String(email || "").split("@")[0];
  return normalizeUsername(emailName || name);
}

async function getUniqueUsername(baseUsername, existingUserId = null) {
  const base = normalizeUsername(baseUsername);
  let username = base;
  let suffix = 0;

  const queryForUsername = () => {
    const query = { username };
    if (existingUserId) query._id = { $ne: existingUserId };
    return query;
  };

  while (await User.exists(queryForUsername())) {
    suffix += 1;
    username = `${base.slice(0, 24)}-${suffix}`;
  }

  return username;
}

async function updateGoogleUser(user, profile) {
  const update = {
    provider: "google",
    oauthProvider: "google",
    status: true,
    displayname: "online",
  };

  if (profile.oauthId) update.oauthId = profile.oauthId;
  if (!user.username) {
    update.username = await getUniqueUsername(
      getUsernameBase(profile.email, profile.name),
      user._id
    );
  }
  if ((!user.avatar || user.avatar === "/avatar.jpg") && profile.picture) {
    update.avatar = profile.picture;
  }
  if (!user.developerName && profile.name) update.developerName = profile.name;

  return User.findByIdAndUpdate(user._id, update, {
    returnDocument: "after",
  });
}

export async function findOrCreateGoogleUser({ email, name, picture, oauthId }) {
  const normalizedEmail = normalizeGoogleEmail(email);

  if (!isValidEmail(normalizedEmail)) {
    const error = new Error("Valid Google email is required.");
    error.status = 400;
    throw error;
  }

  const profile = {
    email: normalizedEmail,
    name: typeof name === "string" ? name.trim() : "",
    picture: typeof picture === "string" ? picture.trim() : "",
    oauthId: typeof oauthId === "string" ? oauthId.trim() : "",
  };

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) return updateGoogleUser(existingUser, profile);

  try {
    return await User.create({
      username: await getUniqueUsername(
        getUsernameBase(normalizedEmail, profile.name)
      ),
      email: normalizedEmail,
      avatar: profile.picture || "/avatar.jpg",
      provider: "google",
      oauthProvider: "google",
      oauthId: profile.oauthId,
      about: "Signed in with Google.",
      developerName: profile.name || getUsernameBase(normalizedEmail),
      status: true,
      displayname: "online",
    });
  } catch (error) {
    if (error?.code === 11000) {
      const duplicatedUser = await User.findOne({ email: normalizedEmail });
      if (duplicatedUser) return updateGoogleUser(duplicatedUser, profile);
    }

    throw error;
  }
}
