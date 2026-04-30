import connectDB from "../../../lib/mongoose";

import { NextResponse } from "next/server";
import {
  DEFAULT_MEDIA_MAX_BYTES,
  mediaErrorResponse,
  storeUploadedFile,
} from "../../../lib/mediaStorage";

export async function POST(req) {
  try {
    const formData = await req.formData();

    await connectDB();

    const file = formData.get("file");
    const userId = formData.get("userId");

    const { url: mediaUrl } = await storeUploadedFile(file, {
      bucket: "chat",
      owner: userId,
      allowedTypes: [
        "image/",
        "video/",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
      ],
      maxBytes: DEFAULT_MEDIA_MAX_BYTES,
    });

    return NextResponse.json({ media: mediaUrl });
  } catch (error) {
    return mediaErrorResponse(error, NextResponse);
  }
}
