import connectDB from "../../../lib/mongoose";
import Group from "../../../models/Group";
import User from "../../../models/User";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const userId = typeof body.user_id === "string" ? body.user_id : "";
    const isPublic = Boolean(body.isPublic);

    if (!name || !userId) {
      return NextResponse.json(
        { error: "Group name and user_id are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const members = isPublic ? await User.distinct("_id") : [userId];
    if (!members.some((memberId) => String(memberId) === String(userId))) {
      members.push(userId);
    }

    const group = await Group.create({
      name,
      admin: userId,
      members,
      isPublic,
      description: isPublic
        ? "Public community open to every Egchat member."
        : "",
    });
    const populatedGroup = await Group.findById(group._id)
      .populate("members", "username email avatar")
      .populate("approve", "username email avatar")
      .populate("admin", "username email avatar");

    return NextResponse.json(
      { message: "Group created", group: populatedGroup },
      { status: 201 }
    );

  } catch (error) {
    if (error?.code === 11000) {
      return NextResponse.json(
        { error: "A group with this name already exists." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
