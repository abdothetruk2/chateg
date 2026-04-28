import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "../../../lib/mongoose";
import User from "../../../models/User";

export async function PUT(req) {
  try {
    const body = await req.json();
    const { user_id, username, about } = body;

    if (!user_id || !mongoose.Types.ObjectId.isValid(user_id)) {
      return NextResponse.json(
        { message: "Valid user_id is required" },
        { status: 400 }
      );
    }

    const update = {};

    if (typeof username === "string" && username.trim()) {
      update.username = username.trim();
    }

    if (typeof about === "string") {
      update.about = about.trim();
    }

    await connectDB();

    const user = await User.findByIdAndUpdate(user_id, update, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Profile updated successfully", user },
      { status: 200 }
    );
  } catch (error) {
    if (error?.code === 11000) {
      return NextResponse.json(
        { message: "Username already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: error.message || "Server error" },
      { status: 500 }
    );
  }
}
