import connectDB from "../../../lib/mongoose";
import User from "../../../models/User"
import { NextResponse } from "next/server";
export async function GET() {
  try {
    await connectDB();

    const users = await User.find()
      .select("-password")
      .sort({ status: -1, username: 1 });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Users fetch failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
