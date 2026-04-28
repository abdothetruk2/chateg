import { NextResponse } from "next/server";
import connectDB from "../../../lib/mongoose";
import Group from "../../../models/Group";

export async function GET() {
  await connectDB();

  const group = await Group.find()
    .populate("members", "username email avatar")
    .populate("approve", "username email avatar")
    .populate("admin", "username email avatar");

  return NextResponse.json(group);
}
