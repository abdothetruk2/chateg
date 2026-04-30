import mongoose from "mongoose";
import { NextResponse } from "next/server";
import connectDB from "../../../../lib/mongoose";
import Post from "../../../../models/Post";

const populatePost = [
  { path: "user", select: "username avatar about" },
  { path: "comments.user", select: "username avatar" },
];

export async function PATCH(req, context) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const action = typeof body.action === "string" ? body.action : "";
    const userId = typeof body.userId === "string" ? body.userId : "";

    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return NextResponse.json(
        { message: "Valid post id and userId are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const post = await Post.findById(id);

    if (!post) {
      return NextResponse.json({ message: "Post not found" }, { status: 404 });
    }

    if (action === "like") {
      const hasLiked = post.likes.some(
        (item) => item.toString() === userId
      );

      if (hasLiked) {
        post.likes.pull(userId);
      } else {
        post.likes.addToSet(userId);
      }
    } else if (action === "comment") {
      const message = typeof body.message === "string" ? body.message.trim() : "";

      if (!message) {
        return NextResponse.json(
          { message: "Comment is required" },
          { status: 400 }
        );
      }

      post.comments.push({
        user: userId,
        message,
      });
    } else {
      return NextResponse.json(
        { message: "action must be like or comment" },
        { status: 400 }
      );
    }

    await post.save();

    const populatedPost = await Post.findById(id).populate(populatePost);

    return NextResponse.json(populatedPost, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Failed to update post" },
      { status: 500 }
    );
  }
}
