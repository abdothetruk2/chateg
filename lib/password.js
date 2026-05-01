import crypto from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(crypto.scrypt);
const KEY_LENGTH = 64;

export async function hashPassword(password = "") {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scrypt(String(password), salt, KEY_LENGTH);

  return `scrypt$${salt}$${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password = "", storedPassword = "") {
  if (!storedPassword) return false;

  if (!storedPassword.startsWith("scrypt$")) {
    return String(password) === String(storedPassword);
  }

  const [, salt, key] = storedPassword.split("$");
  if (!salt || !key) return false;

  const keyBuffer = Buffer.from(key, "hex");
  const derivedKey = await scrypt(String(password), salt, keyBuffer.length);

  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

export function needsPasswordRehash(storedPassword = "") {
  return Boolean(storedPassword) && !storedPassword.startsWith("scrypt$");
}
