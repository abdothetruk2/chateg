import { NextResponse } from "next/server";
import connectDB from "../../../lib/mongoose";
import User from "../../../models/User"
import { writeFile } from "fs/promises";
import path from "path";

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

    // ✅ buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // ✅ اسم unique قوي
    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}-${file.name}`;

    const filePath = path.join(
      process.cwd(),
      "public/uploads",
      fileName
    );

    await writeFile(filePath, buffer);

    const imageUrl = `/uploads/${fileName}`;

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
    return NextResponse.json(
      { message: "Error", error: error.message },
      { status: 500 }
    );
  }
}