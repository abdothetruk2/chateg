import connectDB from "../../../lib/mongoose";
import User from "../../../models/User"
import { sanitizeUser } from "../../../lib/auth";
import {
  hashPassword,
  needsPasswordRehash,
  verifyPassword,
} from "../../../lib/password";

export async function POST(req) {
  try {
    const body = await req.json();
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!username || !password) {
      return Response.json(
        { message: "Username and password are required" },
        { status: 400 }
      );
    }


    await connectDB();

    const user = await User.findOne({
      username,
    });




    if (!user) {
      return Response.json(
        { message: "Invalid username or password" },
        { status: 401 }
      );
    }

    const passwordIsValid = await verifyPassword(password, user.password);

    if (!passwordIsValid) {
      return Response.json(
        { message: "Invalid username or password" },
        { status: 401 }
      );
    }

    const passwordUpdate = needsPasswordRehash(user.password)
      ? { password: await hashPassword(password) }
      : {};

    await User.findByIdAndUpdate(
      { _id: user._id },
      { ...passwordUpdate, status: true, displayname: "online" },
      { returnDocument: "after" }
    );

    const safeUser = sanitizeUser(user);
    safeUser.status = true;
    safeUser.displayname = "online";

    return Response.json(
      {
        message: "Login successful",
        user: safeUser
      },
      { status: 200 }
    );
  } catch (error) {
    return Response.json(
      { error: error.message || "Server error" },
      { status: 500 }
    );
  }
}
