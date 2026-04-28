import connectDB from "../../../lib/mongoose";
import Group from "../../../models/Group";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();

    await connectDB();

    const group = await Group.create({
      name: body.name,
      admin: body.user_id,
      members: [body.user_id], // الأدمن يبقى أول عضو
    });

    return NextResponse.json(
      { message: "Group created", group },
      { status: 201 }
    );

  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}