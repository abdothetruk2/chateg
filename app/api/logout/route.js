import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { clearAuthCookie, getRequestUser } from "../../../lib/auth";
import connectDB from "../../../lib/mongoose";
import User from "../../../models/User";

export async function POST(req) {
  const cookieUser = getRequestUser(req);

  try {
    if (mongoose.Types.ObjectId.isValid(cookieUser?._id)) {
      await connectDB();
      await User.findByIdAndUpdate(cookieUser._id, {
        status: false,
        displayname: "offline",
        socketId: "",
      });
    }
  } catch (error) {
    console.error("Logout presence update failed:", error);
  }

  const response = NextResponse.json({ message: "Logged out" }, { status: 200 });
  clearAuthCookie(response);
  return response;
}
