import { NextResponse } from "next/server";
import connectDB from "../../../lib/mongoose";
import User from "../../../models/User"
import {
  AVATAR_MAX_BYTES,
  mediaErrorResponse,
  storeUploadedFile,
} from "../../../lib/mediaStorage";

export async function POST(req) {
  try {
    await connectDB();

    const formData = await req.formData();

    const file = formData.get("file");
    const user_id = formData.get("user_id");

    // ✅ validation
    if (!file || typeof file === "string") {
      return NextResponse.json(
        { message: "Invalid file" },
        { status: 400 }
      );
    }

    if (!user_id) {
      return NextResponse.json(
        { message: "User ID required" },
        { status: 400 }
      );
    }

    // ✅ نوع الملف (اختياري بس مهم)
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { message: "Only images allowed" },
        { status: 400 }
      );
    }

    const { url: imageUrl } = await storeUploadedFile(file, {
      bucket: "avatar",
      owner: user_id,
      allowedTypes: ["image/"],
      maxBytes: AVATAR_MAX_BYTES,
    });

    // ✅ update بدل create

    
    const user = await User.findByIdAndUpdate(
      user_id,
      { avatar: imageUrl },
      { new: true }
    );

    return NextResponse.json({
      message: "Avatar updated",
      avatar: imageUrl,
      user,
    });
  } catch (error) {
    return mediaErrorResponse(error, NextResponse);
  }
}
