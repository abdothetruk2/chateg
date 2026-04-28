import connectDB from "../../../lib/mongoose";
import User from "../../../models/User"

export async function POST(req) {
  try {
    const body = await req.json();

    await connectDB();

    const user = await User.create({
      username: body.username,
      email: body.email,
      password: body.password,
      status: true,
      displayname: "online",
    });

    const safeUser = user.toObject();
    delete safeUser.password;
    safeUser.status = true;
    safeUser.displayname = "online";

    return Response.json(
      {
        message: "Register successful",
        user: safeUser,
      },
      { status: 201 }
    );
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
