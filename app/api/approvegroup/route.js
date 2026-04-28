import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "../../../lib/mongoose";
import Group from "../../../models/Group";

function getGroupQuery({ groupId, name }) {
  if (groupId && mongoose.Types.ObjectId.isValid(groupId)) {
    return { _id: groupId };
  }

  if (typeof name === "string" && name.trim()) {
    return { name: name.trim() };
  }

  return null;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { userId, adminId } = body;
    const groupQuery = getGroupQuery(body);

    if (!groupQuery) {
      return NextResponse.json(
        { message: "groupId or name is required" },
        { status: 400 }
      );
    }

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { message: "Valid userId is required" },
        { status: 400 }
      );
    }

    if (!adminId || !mongoose.Types.ObjectId.isValid(adminId)) {
      return NextResponse.json(
        { message: "Valid adminId is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const group = await Group.findOne(groupQuery);

    if (!group) {
      return NextResponse.json({ message: "Group not found" }, { status: 404 });
    }

    if (group.admin.toString() !== adminId) {
      return NextResponse.json(
        { message: "Only the group admin can approve members" },
        { status: 403 }
      );
    }

    const updatedGroup = await Group.findOneAndUpdate(
      groupQuery,
      {
        $addToSet: { members: userId },
        $pull: { approve: userId },
      },
      { new: true }
    )
      .populate("members", "username email avatar")
      .populate("approve", "username email avatar")
      .populate("admin", "username email avatar");

    return NextResponse.json(
      { message: "Group member approved", group: updatedGroup },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Server error" },
      { status: 500 }
    );
  }
}
