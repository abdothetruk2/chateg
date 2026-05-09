import connectDB from "../../../lib/mongoose";
import Messages from "../../../models/Messages";
import { NextResponse } from "next/server";

function getNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getGoogleMapsLink(latitude, longitude) {
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
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
      conversationType = "",
      clientId = "",
      avatar = "",
      chat = "",
      storyReply = null,
      location = null,
      latitude = null,
      longitude = null,
      accuracy = null,
    } = body;
    const normalizedLocation = normalizeLocation(
      location || { latitude, longitude, accuracy }
    );
    const isLocationMessage = type === "location" || Boolean(normalizedLocation);
    const normalizedConversationType =
      conversationType === "group" ||
      type === "group" ||
      (isLocationMessage && chat)
        ? "group"
        : "user";
    const messageType = isLocationMessage ? "location" : normalizedConversationType;

    if (!sender || !receiver) {
      return NextResponse.json(
        { error: "sender and receiver are required" },
        { status: 400 }
      );
    }

    if (type === "location" && !normalizedLocation) {
      return NextResponse.json(
        { error: "Valid latitude and longitude are required" },
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
      message:
        isLocationMessage && normalizedLocation && !message.trim()
          ? getGoogleMapsLink(
              normalizedLocation.latitude,
              normalizedLocation.longitude
            )
          : message.trim(),
      media,
      mediaType,
      avatar,
      clientId,
      type: messageType,
      conversationType: normalizedConversationType,
      chat: normalizedConversationType === "group" ? chat || receiver : "",
      unread: 1,
    };

    if (storyReply?.storyId) {
      messageData.storyReply = storyReply;
    }

    if (normalizedLocation) {
      messageData.location = normalizedLocation;
      messageData.latitude = normalizedLocation.latitude;
      messageData.longitude = normalizedLocation.longitude;
      messageData.accuracy = normalizedLocation.accuracy;
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
