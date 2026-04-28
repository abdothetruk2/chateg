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

function populateGroup(query) {
  return Group.findOne(query)
    .populate("members", "username email avatar")
    .populate("approve", "username email avatar")
    .populate("admin", "username email avatar");
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { userId } = body;
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

    await connectDB();

    const group = await Group.findOne(groupQuery);

    if (!group) {
      return NextResponse.json(
        { message: "Group not found" },
        { status: 404 }
      );
    }

    const isMember = group.members?.some((id) => id.toString() === userId);

    if (isMember) {
      const populatedGroup = await populateGroup(groupQuery);

      return NextResponse.json(
        { message: "Already a group member", group: populatedGroup },
        { status: 200 }
      );
    }

    const isPending = group.approve?.some((id) => id.toString() === userId);

    if (isPending) {
      const populatedGroup = await populateGroup(groupQuery);

      return NextResponse.json(
        { message: "Join request already pending", group: populatedGroup },
        { status: 200 }
      );
    }

    const updatedGroup = await Group.findOneAndUpdate(
      groupQuery,
      { $addToSet: { approve: userId } },
      { new: true }
    )
      .populate("members", "username email avatar")
      .populate("approve", "username email avatar")
      .populate("admin", "username email avatar");

    return NextResponse.json(
      { message: "Join request sent", group: updatedGroup },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Server error" },
      { status: 500 }
    );
  }
}
