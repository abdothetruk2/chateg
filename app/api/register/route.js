import connectDB from "../../../lib/mongoose";
import User from "../../../models/User";
import { NextResponse } from "next/server";
import { sanitizeUser, setAuthCookie } from "../../../lib/auth";
import { hashPassword } from "../../../lib/password";
import { ensurePublicRoomIncludesUser } from "../../../lib/publicRoom";

export async function POST(req) {
  try {
    const body = await req.json();
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!username || !email || password.length < 6) {
      return NextResponse.json(
        { error: "Username, email, and a 6+ character password are required." },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.create({
      username,
      email,
      password: await hashPassword(password),
      status: true,
      displayname: "online",
    });
    await ensurePublicRoomIncludesUser(user._id);

    const safeUser = sanitizeUser(user);
    safeUser.status = true;
    safeUser.displayname = "online";

    const response = NextResponse.json(
      {
        message: "Register successful",
        user: safeUser,
      },
      { status: 201 }
    );

    setAuthCookie(response, safeUser);
    return response;
  } catch (error) {
    if (error?.code === 11000) {
      return NextResponse.json(
        { error: "Username or email already exists." },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
