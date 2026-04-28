import Story from "../../../../models/Story";
import connectDB from "../../../../lib/mongoose";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await connectDB();

    const stories = await Story.find()
      .populate("user", "username avatar")
      .populate("replies.user", "username avatar")
      .sort({ createdAt: -1 });

    return NextResponse.json(stories, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch stories" },
      { status: 500 }
    );
  }
}
