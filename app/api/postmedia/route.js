import { NextResponse } from "next/server";
import connectDB from "../../../lib/mongoose";
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

    const { file: storedFile, url: mediaUrl } = await storeUploadedFile(file, {
      bucket: "post",
      owner: userId,
      allowedTypes: ["image/", "video/"],
      maxBytes: DEFAULT_MEDIA_MAX_BYTES,
    });

    return NextResponse.json({
      mediaUrl,
      mediaType: storedFile.contentType || file.type || "",
    });
  } catch (error) {
    return mediaErrorResponse(error, NextResponse);
  }
}
