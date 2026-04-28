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

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const groupQuery = getGroupQuery({
      groupId: searchParams.get("groupId"),
      name: searchParams.get("name"),
    });

    if (!groupQuery) {
      return NextResponse.json(
        { message: "groupId or name is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const group = await populateGroup(groupQuery);

    if (!group) {
      return NextResponse.json(
        { message: "Group not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        group,
        members: group.members,
        approve: group.approve,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Server error" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { action, userId, adminId } = body;
    const groupQuery = getGroupQuery(body);

    if (!groupQuery) {
      return NextResponse.json(
        { message: "groupId or name is required" },
        { status: 400 }
      );
    }

    if (!["add", "remove"].includes(action)) {
      return NextResponse.json(
        { message: "action must be add or remove" },
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
      return NextResponse.json(
        { message: "Group not found" },
        { status: 404 }
      );
    }

    if (group.admin.toString() !== adminId) {
      return NextResponse.json(
        { message: "Only the group admin can update members" },
        { status: 403 }
      );
    }

    if (action === "remove" && group.admin.toString() === userId) {
      return NextResponse.json(
        { message: "Group admin cannot be removed from members" },
        { status: 400 }
      );
    }

    const update =
      action === "add"
        ? { $addToSet: { members: userId }, $pull: { approve: userId } }
        : { $pull: { members: userId, approve: userId } };

    const updatedGroup = await Group.findOneAndUpdate(groupQuery, update, {
      new: true,
    })
      .populate("members", "username email avatar")
      .populate("approve", "username email avatar")
      .populate("admin", "username email avatar");

    return NextResponse.json(
      {
        message:
          action === "add" ? "Group member added" : "Group member removed",
        group: updatedGroup,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Server error" },
      { status: 500 }
    );
  }
}
