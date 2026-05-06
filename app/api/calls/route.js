import { NextResponse } from "next/server";
import connectDB from "../../../lib/mongoose";
import Call from "../../../models/Call";

const allowedCallTypes = new Set(["audio", "video"]);
const allowedStatuses = new Set([
  "ringing",
  "accepted",
  "ended",
  "missed",
  "declined",
  "failed",
]);

function normalizeText(value = "") {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const username = normalizeText(searchParams.get("username"));
    const rawLimit = Number.parseInt(searchParams.get("limit") || "20", 10);
    const limit = Number.isFinite(rawLimit)
      ? Math.min(Math.max(rawLimit, 1), 50)
      : 20;

    if (!username) {
      return NextResponse.json(
        { message: "username is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const calls = await Call.find({
      $or: [{ caller: username }, { receiver: username }, { room: username }],
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({ calls }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Failed to fetch calls" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const caller = normalizeText(body.caller);
    const receiver = normalizeText(body.receiver);
    const room = normalizeText(body.room);
    const callType = allowedCallTypes.has(body.callType)
      ? body.callType
      : "video";
    const status = allowedStatuses.has(body.status) ? body.status : "ringing";
    const scope = room ? "group" : "direct";

    if (!caller || (!receiver && !room)) {
      return NextResponse.json(
        { message: "caller and receiver or room are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const call = await Call.create({
      caller,
      receiver,
      room,
      scope,
      callType,
      status,
      startedAt: new Date(),
    });

    return NextResponse.json({ call }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Failed to create call" },
      { status: 500 }
    );
  }
}
