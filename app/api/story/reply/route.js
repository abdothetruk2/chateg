import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "../../../../lib/mongoose";
import Messages from "../../../../models/Messages";
import Story from "../../../../models/Story";
import User from "../../../../models/User";

export async function POST(req) {
  try {
    const body = await req.json();

    const storyId = typeof body.storyId === "string" ? body.storyId.trim() : "";
    const senderId =
      typeof body.senderId === "string" ? body.senderId.trim() : "";
    const text = typeof body.message === "string" ? body.message.trim() : "";

    if (!storyId || !senderId || !text) {
      return NextResponse.json(
        { message: "storyId, senderId and message are required" },
        { status: 400 }
      );
    }

    if (
      !mongoose.isValidObjectId(storyId) ||
      !mongoose.isValidObjectId(senderId)
    ) {
      return NextResponse.json(
        { message: "Invalid storyId or senderId" },
        { status: 400 }
      );
    }

    await connectDB();

    const [story, sender] = await Promise.all([
      Story.findById(storyId).populate("user", "username avatar"),
      User.findById(senderId).select("username avatar"),
    ]);

    if (!story) {
      return NextResponse.json({ message: "Story not found" }, { status: 404 });
    }

    if (story.expiresAt && story.expiresAt.getTime() <= Date.now()) {
      return NextResponse.json({ message: "Story expired" }, { status: 410 });
    }

    if (!sender) {
      return NextResponse.json({ message: "Sender not found" }, { status: 404 });
    }

    const owner = story.user;
    if (!owner?.username) {
      return NextResponse.json(
        { message: "Story owner not found" },
        { status: 404 }
      );
    }

    if (String(owner._id) === String(sender._id)) {
      return NextResponse.json(
        { message: "You cannot reply to your own status" },
        { status: 400 }
      );
    }

    const createdMessage = await Messages.create({
      sender: sender.username,
      receiver: owner.username,
      recname: owner.username,
      message: text,
      avatar: sender.avatar || "",
      type: "user",
      storyReply: {
        storyId: story._id,
        mediaUrl: story.mediaUrl,
        caption: story.caption || "",
        owner: owner.username,
      },
    });

    const reply = {
      user: sender._id,
      message: text,
      messageId: createdMessage._id,
      createdAt: new Date(),
    };

    story.replies.push(reply);
    await story.save();

    return NextResponse.json(
      {
        message: createdMessage,
        reply: story.replies[story.replies.length - 1],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/story/reply error:", error);

    return NextResponse.json(
      { message: "Failed to reply to story" },
      { status: 500 }
    );
  }
}
