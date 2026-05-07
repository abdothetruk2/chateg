import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { getRequestUser } from "../../../../lib/auth";
import connectDB from "../../../../lib/mongoose";
import LiveLocation from "../../../../models/LiveLocation";

const LIVE_LOCATION_TTL_MS = 60 * 60 * 1000;

function cleanText(value = "") {
  return typeof value === "string" ? value.trim() : "";
}

function getNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function isValidCoordinate(latitude, longitude) {
  return (
    latitude !== null &&
    longitude !== null &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function serializeLocation(location) {
  const value =
    typeof location?.toObject === "function" ? location.toObject() : location;

  return {
    _id: String(value._id || ""),
    ownerId: value.ownerId || "",
    ownerUsername: value.ownerUsername || "",
    receiver: value.receiver || "",
    recname: value.recname || "",
    chat: value.chat || "",
    type: value.type || "user",
    latitude: value.latitude,
    longitude: value.longitude,
    accuracy: value.accuracy,
    isLive: Boolean(value.isLive),
    startedAt: value.startedAt,
    updatedAt: value.updatedAt,
    expiresAt: value.expiresAt,
  };
}

export async function POST(req) {
  try {
    const user = getRequestUser(req);

    if (!user?._id || !user?.username) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const latitude = getNumber(body.latitude);
    const longitude = getNumber(body.longitude);
    const accuracy = getNumber(body.accuracy);
    const type = body.type === "group" ? "group" : "user";
    const receiver = cleanText(body.receiver);
    const recname = cleanText(body.recname || receiver);
    const chat = type === "group" ? cleanText(body.chat || receiver) : "";

    if (!receiver) {
      return NextResponse.json(
        { message: "Location receiver is required" },
        { status: 400 }
      );
    }

    if (!isValidCoordinate(latitude, longitude)) {
      return NextResponse.json(
        { message: "Valid latitude and longitude are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const now = new Date();
    const activeLocation = await LiveLocation.findOne({
      ownerId: user._id,
      receiver,
      type,
      isLive: true,
      expiresAt: { $gt: now },
    });

    const location = activeLocation
      ? await LiveLocation.findByIdAndUpdate(
          activeLocation._id,
          {
            latitude,
            longitude,
            accuracy,
          },
          { new: true }
        )
      : await LiveLocation.create({
          ownerId: user._id,
          ownerUsername: user.username,
          receiver,
          recname,
          chat,
          type,
          latitude,
          longitude,
          accuracy,
          isLive: true,
          startedAt: now,
          expiresAt: new Date(now.getTime() + LIVE_LOCATION_TTL_MS),
        });

    return NextResponse.json(
      { location: serializeLocation(location) },
      { status: activeLocation ? 200 : 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Failed to save live location" },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    const user = getRequestUser(req);

    if (!user?._id) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const locationId = cleanText(body.locationId);
    const receiver = cleanText(body.receiver);
    const type = body.type === "group" ? "group" : "user";
    const query = {
      ownerId: user._id,
      isLive: true,
    };

    if (locationId && mongoose.Types.ObjectId.isValid(locationId)) {
      query._id = locationId;
    } else if (receiver) {
      query.receiver = receiver;
      query.type = type;
    } else {
      return NextResponse.json(
        { message: "Location id or receiver is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const location = await LiveLocation.findOneAndUpdate(
      query,
      {
        isLive: false,
        stoppedAt: new Date(),
        expiresAt: new Date(),
      },
      { new: true }
    );

    if (!location) {
      return NextResponse.json(
        { message: "No active live location found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { location: serializeLocation(location) },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Failed to stop live location" },
      { status: 500 }
    );
  }
}
