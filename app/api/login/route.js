import { NextResponse } from "next/server";
import { sanitizeUser, setAuthCookie } from "../../../lib/auth";
import connectDB from "../../../lib/mongoose";
import {
  hashPassword,
  needsPasswordRehash,
  verifyPassword,
} from "../../../lib/password";
import { ensurePublicRoomIncludesUser } from "../../../lib/publicRoom";
import User from "../../../models/User";

export async function POST(req) {
  try {
    const body = await req.json();
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!username || !password) {
      return NextResponse.json(
        { message: "Username and password are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findOne({ username });

    if (!user) {
      return NextResponse.json(
        { message: "Invalid username or password" },
        { status: 401 }
      );
    }

    const passwordIsValid = await verifyPassword(password, user.password);

    if (!passwordIsValid) {
      return NextResponse.json(
        { message: "Invalid username or password" },
        { status: 401 }
      );
    }

    const passwordUpdate = needsPasswordRehash(user.password)
      ? { password: await hashPassword(password) }
      : {};

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { ...passwordUpdate, status: true, displayname: "online" },
      { returnDocument: "after" }
    );

    await ensurePublicRoomIncludesUser(user._id);

    const safeUser = sanitizeUser(updatedUser);
    const response = NextResponse.json(
      {
        message: "Login successful",
        user: safeUser,
      },
      { status: 200 }
    );

    setAuthCookie(response, safeUser);
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Server error" },
      { status: 500 }
    );
  }
}
