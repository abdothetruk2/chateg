import mongoose from "mongoose";
import { NextResponse } from "next/server";
import connectDB from "../../../lib/mongoose";
import Post from "../../../models/Post";

const populatePost = [
  { path: "user", select: "username avatar coverPhoto about jobTitle location developerName" },
  { path: "comments.user", select: "username avatar jobTitle" },
];

export async function GET() {
  try {
    await connectDB();

    const posts = await Post.find()
      .populate(populatePost)
      .sort({ createdAt: -1 });

    return NextResponse.json(posts, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Failed to fetch posts" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const userId = typeof body.userId === "string" ? body.userId : "";
    const content = typeof body.content === "string" ? body.content.trim() : "";
    const mediaUrl = typeof body.mediaUrl === "string" ? body.mediaUrl : "";
    const mediaType = typeof body.mediaType === "string" ? body.mediaType : "";
    const postType = body.postType === "group" ? "group" : "profile";

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { message: "Valid userId is required" },
        { status: 400 }
      );
    }

    if (!content && !mediaUrl) {
      return NextResponse.json(
        { message: "Post text or media is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const post = await Post.create({
      user: userId,
      content,
      mediaUrl,
      mediaType,
      postType,
    });

    const populatedPost = await Post.findById(post._id).populate(populatePost);

    return NextResponse.json(populatedPost, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Failed to create post" },
      { status: 500 }
    );
  }
}
