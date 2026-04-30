import { NextResponse } from "next/server";
import connectDB from "../../../lib/mongoose";
import {
  DEFAULT_MEDIA_MAX_BYTES,
  mediaErrorResponse,
  storeUploadedFile,
} from "../../../lib/mediaStorage";
export async function POST(req) {
  try {
    const body = await req.formData();
    await connectDB();

    const file = body.get("file");
    const userId = body.get("user_id");
    const { url: mediaUrl } = await storeUploadedFile(file, {
      bucket: "story",
      owner: userId,
      allowedTypes: ["image/", "video/"],
      maxBytes: DEFAULT_MEDIA_MAX_BYTES,
    });

    return NextResponse.json({ mediaUrl });
  } catch (error) {
    return mediaErrorResponse(error, NextResponse);
  }
}
