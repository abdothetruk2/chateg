import mongoose from "mongoose";
import { NextResponse } from "next/server";
import connectDB from "../../../../lib/mongoose";
import Messages from "../../../../models/Messages";

export async function PATCH(req, context) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const action = typeof body.action === "string" ? body.action : "";
    const userId = typeof body.userId === "string" ? body.userId : "";
    const emoji = typeof body.emoji === "string" ? body.emoji.trim() : "";

    if (!mongoose.Types.ObjectId.isValid(id) || !userId) {
      return NextResponse.json(
        { message: "Valid message id and userId are required" },
        { status: 400 }
      );
    }

    if (action !== "react") {
      return NextResponse.json(
        { message: "action must be react" },
        { status: 400 }
      );
    }

    await connectDB();

    const message = await Messages.findById(id);

    if (!message) {
      return NextResponse.json(
        { message: "Message not found" },
        { status: 404 }
      );
    }

    message.reactions = (message.reactions || []).filter(
      (reaction) => String(reaction.user) !== String(userId)
    );

    if (emoji) {
      message.reactions.push({ user: userId, emoji });
    }

    await message.save();

    return NextResponse.json({ message }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Failed to update message" },
      { status: 500 }
    );
  }
}

export async function DELETE(req, context) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const username = typeof body.username === "string" ? body.username : "";

    if (!mongoose.Types.ObjectId.isValid(id) || !username) {
      return NextResponse.json(
        { message: "Valid message id and username are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const message = await Messages.findById(id);

    if (!message) {
      return NextResponse.json(
        { message: "Message not found" },
        { status: 404 }
      );
    }

    if (message.sender !== username) {
      return NextResponse.json(
        { message: "You can delete only your messages" },
        { status: 403 }
      );
    }

    await message.deleteOne();

    return NextResponse.json({ message: "Message deleted", id }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Failed to delete message" },
      { status: 500 }
    );
  }
}
