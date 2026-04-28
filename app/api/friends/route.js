import { NextResponse } from "next/server";
import connectDB from "../../../lib/mongoose";
import User from "../../../models/User";

export async function POST(req) {
  try {
    const body = await req.json();

    await connectDB();

 
    const user = await User.findById(body._id).populate(
      "friends",
      "-password"
    );

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { friends: user.friends },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Server error" },
      { status: 500 }
    );
  }
}
