import mongoose from "mongoose";
import { NextResponse } from "next/server";
import connectDB from "../../../../lib/mongoose";
import Call from "../../../../models/Call";

const allowedStatuses = new Set([
  "ringing",
  "accepted",
  "ended",
  "missed",
  "declined",
  "failed",
]);

export async function PUT(req, context) {
  try {
    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Valid call id is required" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const status = typeof body.status === "string" ? body.status : "";

    if (!allowedStatuses.has(status)) {
      return NextResponse.json(
        { message: "Valid call status is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const call = await Call.findById(id);

    if (!call) {
      return NextResponse.json({ message: "Call not found" }, { status: 404 });
    }

    const now = new Date();
    call.status = status;

    if (status === "accepted" && !call.answeredAt) {
      call.answeredAt = now;
    }

    if (["ended", "missed", "declined", "failed"].includes(status)) {
      call.endedAt = now;
      const startedAt = new Date(call.answeredAt || call.startedAt).getTime();
      call.durationSeconds = Math.max(
        0,
        Math.round((now.getTime() - startedAt) / 1000)
      );
    }

    await call.save();

    return NextResponse.json({ call }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Failed to update call" },
      { status: 500 }
    );
  }
}
