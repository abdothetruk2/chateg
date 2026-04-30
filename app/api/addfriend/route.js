import connectDB from "../../../lib/mongoose";
import User from "../../../models/User";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

export async function POST(req) {
  try {
    const body = await req.json();
    const { userId, friendId, action = "request" } = body;

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

    const alreadyFriend = user.friends?.some((id) => id.toString() === friendId);

    if (alreadyFriend) {
      return NextResponse.json(
        { message: "Already friends", status: "friends" },
        { status: 200 }
      );
    }

    if (action === "decline") {
      await User.findByIdAndUpdate(userId, {
        $pull: { friendRequests: friendId },
      });

      await User.findByIdAndUpdate(friendId, {
        $pull: { sentFriendRequests: userId },
      });

      return NextResponse.json(
        { message: "Friend request declined", status: "none" },
        { status: 200 }
      );
    }

    const hasIncomingRequest = user.friendRequests?.some(
      (id) => id.toString() === friendId
    );

    if (action === "accept" || hasIncomingRequest) {
      await User.findByIdAndUpdate(userId, {
        $addToSet: { friends: friendId },
        $pull: { friendRequests: friendId, sentFriendRequests: friendId },
      });

      await User.findByIdAndUpdate(friendId, {
        $addToSet: { friends: userId },
        $pull: { friendRequests: userId, sentFriendRequests: userId },
      });

      return NextResponse.json(
        { message: "Friend request accepted", status: "friends" },
        { status: 200 }
      );
    }

    const requestAlreadySent = friend.friendRequests?.some(
      (id) => id.toString() === userId
    );

    if (!requestAlreadySent) {
      await User.findByIdAndUpdate(userId, {
        $addToSet: { sentFriendRequests: friendId },
      });

      await User.findByIdAndUpdate(friendId, {
        $addToSet: { friendRequests: userId },
      });
    }

    return NextResponse.json(
      { message: "Friend request sent", status: "pending" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Server error" },
      { status: 500 }
    );
  }
}
