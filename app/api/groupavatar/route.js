
import { NextResponse } from "next/server";
import connectDB from "../../../lib/mongoose"
import Group from "../../../models/Group"
import {
  AVATAR_MAX_BYTES,
  mediaErrorResponse,
  storeUploadedFile,
} from "../../../lib/mediaStorage";
export async function POST(req) {
  try {
    const formdata = await req.formData();
    await connectDB();

    const file = formdata.get("file");
    const name = formdata.get("name");
    const { url: fileurl } = await storeUploadedFile(file, {
      bucket: "group-avatar",
      allowedTypes: ["image/"],
      maxBytes: AVATAR_MAX_BYTES,
    });

    const group = await Group.findOneAndUpdate(
      { name },
      { avatar: fileurl },
      { new: true }
    );

    return NextResponse.json({ group, avatar: fileurl });
  } catch (error) {
    return mediaErrorResponse(error, NextResponse);
  }
}
