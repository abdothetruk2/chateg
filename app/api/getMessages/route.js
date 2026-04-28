import { NextResponse } from "next/server";
import connectDB from "../../../lib/mongoose";
import Messages from "../../../models/Messages";

export async function POST(req) {
  try {
    const body = await req.json();

    const sender =
      typeof body.sender === "string" ? body.sender.trim() : "";
    const receiver =
      typeof body.receiver === "string" ? body.receiver.trim() : "";
    const type =
      typeof body.type === "string" ? body.type.trim() : "user";



    if (type !== "group" && !sender) {
      return NextResponse.json(
        { message: "sender is required" },
        { status: 400 }
      );
    }

    await connectDB();

    if (type === "group") {
      const messages = await Messages.find({
        chat: receiver,
      }).sort({ createdAt: 1 });

      return NextResponse.json(messages, { status: 200 });
    }


    const unread=await Messages.find({sender:sender,read:false})
    const messages = await Messages.find({
      $or: [
        { sender, receiver },
        { sender: receiver, receiver: sender },
      ],
    }).sort({ createdAt: 1 });

    return NextResponse.json({messages:messages ,unread:unread},{status:200});
  } catch (error) {
    console.error("POST /api/getMessages error:", error);

    return NextResponse.json(
      { message: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}