import connectDB from "../../../lib/mongoose";
import User from "../../../models/User"

export async function POST(req) {
  try {
    const body = await req.json();

    await connectDB();

    const user = await User.findOne({
      username: body.username,
    });




    if (!user) {
      return Response.json(
        { message: "Invalid username or password" },
        { status: 401 }
      );
    }

    if (user.password !== body.password) {
      return Response.json(
        { message: "Invalid username or password" },
        { status: 401 }
      );
    } 
    await User.findByIdAndUpdate(
      { _id: user._id },
      { status: true, displayname: "online" },
      { new: true }
    );

    const safeUser = user.toObject();
    delete safeUser.password;
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
