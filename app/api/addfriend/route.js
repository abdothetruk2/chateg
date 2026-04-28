import connectDB from "../../../lib/mongoose";
import User from "../../../models/User";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

export async function POST(req) {
  try {
    const body = await req.json();
    const { userId, friendId } = body;

    await connectDB();

    if (!userId || !friendId) {
      return NextResponse.json(
        { message: "userId and friendId are required" },
        { status: 400 }
      );
    }

    if (userId === friendId) {
      return NextResponse.json(
        { message: "You cannot add yourself" },
        { status: 400 }
      );
    }

    if (
      !mongoose.Types.ObjectId.isValid(userId) ||
      !mongoose.Types.ObjectId.isValid(friendId)
    ) {
      return NextResponse.json(
        { message: "Invalid userId or friendId" },
        { status: 400 }
      );
    }

    const user = await User.findById(userId);
    const friend = await User.findById(friendId);

    if (!user || !friend) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    const alreadyFriend = user.friends?.some(
      (id) => id.toString() === friendId
    );

    if (alreadyFriend) {
      return NextResponse.json(
        { message: "Already friends" },
        { status: 400 }
      );
    }

    await User.findByIdAndUpdate(userId, {
      $addToSet: { friends: friendId },
    });

    await User.findByIdAndUpdate(friendId, {
      $addToSet: { friends: userId },
    });

    return NextResponse.json(
      { message: "Friend added successfully" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Server error" },
      { status: 500 }
    );
  }
}