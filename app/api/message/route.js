import connectDB from "../../../lib/mongoose";
import Messages from "../../../models/Messages";
import { NextResponse } from "next/server";

function getNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeLocation(location) {
  if (!location || typeof location !== "object") return null;

  const latitude = getNumber(location.latitude);
  const longitude = getNumber(location.longitude);

  if (
    latitude === null ||
    longitude === null ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  const accuracy = getNumber(location.accuracy);
  const expiresAt = location.expiresAt ? new Date(location.expiresAt) : null;

  return {
    latitude,
    longitude,
    accuracy,
    isLive: Boolean(location.isLive),
    shareId: String(location.shareId || ""),
    expiresAt:
      expiresAt && Number.isFinite(expiresAt.getTime()) ? expiresAt : undefined,
  };
}

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
      mediaType = "",
      type = "user",
      clientId = "",
      avatar = "",
      chat = "",
      storyReply = null,
      location = null,
    } = body;
    const normalizedLocation = normalizeLocation(location);

    if (!sender || !receiver) {
      return NextResponse.json(
        { error: "sender and receiver are required" },
        { status: 400 }
      );
    }

    if (!message.trim() && !media && !storyReply?.storyId && !normalizedLocation) {
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
      mediaType,
      avatar,
      clientId,
      type,
      chat: type === "group" ? chat || receiver : "",
      unread: 1,
    };

    if (storyReply?.storyId) {
      messageData.storyReply = storyReply;
    }

    if (normalizedLocation) {
      messageData.location = normalizedLocation;
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
