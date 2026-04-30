import Messages from "../../../models/Messages";
import connectDB from "../../../lib/mongoose";
import { NextResponse } from "next/server";
import {
  DEFAULT_MEDIA_MAX_BYTES,
  mediaErrorResponse,
  storeUploadedFile,
} from "../../../lib/mediaStorage";
export async function POST(req) {
  try {
    await connectDB();

    const formData = await req.formData();
    const file = formData.get("file");
    const sender = formData.get("sender");
    const receiver = formData.get("receiver");
    const avatar = formData.get("avatar");
    const { url: fileurl } = await storeUploadedFile(file, {
      bucket: "voice",
      allowedTypes: ["audio/", "video/webm", "video/mp4"],
      maxBytes: DEFAULT_MEDIA_MAX_BYTES,
    });

    await Messages.create({
      sender,
      receiver,
      media: fileurl,
      avatar,
    });

    return NextResponse.json({
      url: fileurl,
    });
  } catch (error) {
    return mediaErrorResponse(error, NextResponse);
  }
}
