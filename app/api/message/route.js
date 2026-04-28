import connectDB from "../../../lib/mongoose";
import Messages from "../../../models/Messages";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();

    const {
      sender,
      receiver,
      recname = "",
      message = "",
      media = "",
      type = "user",
      clientId = "",
      avatar = "",
      chat = "",
      storyReply = null,
    } = body;

    if (!sender || !receiver) {
      return NextResponse.json(
        { error: "sender and receiver are required" },
        { status: 400 }
      );
    }

    if (!message.trim() && !media && !storyReply?.storyId) {
      return NextResponse.json(
        { error: "message or media is required" },
        { status: 400 }
      );
    }

    const messageData = {
      sender,
      receiver,
      recname: recname || receiver,
      message: message.trim(),
      media,
      avatar,
      clientId,
      type,
      chat: type === "group" ? chat || receiver : "",
      unread: 1,
    };

    if (storyReply?.storyId) {
      messageData.storyReply = storyReply;
    }

    const createdMessage = await Messages.create(messageData);

    return NextResponse.json(
      {
        success: true,
        message: createdMessage,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/message error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}