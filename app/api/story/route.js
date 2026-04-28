import Story from "../../../models/Story";
import connectDB from "../../../lib/mongoose";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();

    await connectDB();

    const story = await Story.create({
      user: body.userId, // 👈 صح
      mediaUrl: body.mediaUrl,
      caption: typeof body.caption === "string" ? body.caption.trim() : "",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const populatedStory = await story.populate(
      "user",
      "username email avatar"
    );

    return NextResponse.json(populatedStory);

  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
