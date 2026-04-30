import mongoose from "mongoose";
import MediaFile from "../models/MediaFile";

export const MB = 1024 * 1024;
export const DEFAULT_MEDIA_MAX_BYTES = 15 * MB;
export const AVATAR_MAX_BYTES = 5 * MB;

function sanitizeFilename(name = "upload") {
  return name
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120) || "upload";
}

function isAllowedType(contentType, allowedTypes = []) {
  if (!allowedTypes.length) return true;

  return allowedTypes.some((type) => {
    if (type.endsWith("/")) {
      return contentType.startsWith(type);
    }

    return contentType === type;
  });
}

function normalizeOwner(owner) {
  if (!owner || !mongoose.Types.ObjectId.isValid(owner)) return undefined;
  return owner;
}

export async function storeUploadedFile(
  file,
  {
    bucket = "chat",
    owner,
    allowedTypes = [],
    maxBytes = DEFAULT_MEDIA_MAX_BYTES,
  } = {}
) {
  if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") {
    const error = new Error("Invalid file");
    error.status = 400;
    throw error;
  }

  const contentType = file.type || "application/octet-stream";

  if (!isAllowedType(contentType, allowedTypes)) {
    const error = new Error("Unsupported file type");
    error.status = 400;
    throw error;
  }

  if (file.size && file.size > maxBytes) {
    const error = new Error(`File is too large. Maximum size is ${Math.floor(maxBytes / MB)} MB`);
    error.status = 413;
    throw error;
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (!buffer.byteLength) {
    const error = new Error("Empty file");
    error.status = 400;
    throw error;
  }

  if (buffer.byteLength > maxBytes) {
    const error = new Error(`File is too large. Maximum size is ${Math.floor(maxBytes / MB)} MB`);
    error.status = 413;
    throw error;
  }

  const originalName = sanitizeFilename(file.name);
  const filename = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}-${originalName}`;

  const storedFile = await MediaFile.create({
    filename,
    originalName,
    contentType,
    size: buffer.byteLength,
    bucket,
    owner: normalizeOwner(owner),
    data: buffer,
  });

  return {
    file: storedFile,
    url: `/api/media/${storedFile._id}`,
  };
}

export function mediaErrorResponse(error, NextResponse) {
  return NextResponse.json(
    { message: error.message || "Upload failed" },
    { status: error.status || 500 }
  );
}
