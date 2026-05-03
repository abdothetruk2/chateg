import { NextResponse } from "next/server";
import connectDB from "../../../lib/mongoose";
import { ensurePublicRoom } from "../../../lib/publicRoom";
import Group from "../../../models/Group";

export async function GET() {
  await connectDB();
  await ensurePublicRoom();

  const group = await Group.find()
    .populate("members", "username email avatar")
    .populate("approve", "username email avatar")
    .populate("admin", "username email avatar")
    .sort({ isPublic: -1, updatedAt: -1 });

  return NextResponse.json(group);
}
