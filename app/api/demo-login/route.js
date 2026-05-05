import { NextResponse } from "next/server";
import connectDB from "../../../lib/mongoose";
import { sanitizeUser, setAuthCookie } from "../../../lib/auth";
import { hashPassword } from "../../../lib/password";
import { ensurePublicRoom } from "../../../lib/publicRoom";
import Group from "../../../models/Group";
import Messages from "../../../models/Messages";
import User from "../../../models/User";

const demoUsers = [
  {
    username: "demo.recruiter",
    email: "demo.recruiter@egchat.local",
    about: "Reviewing Egchat as a recruiter demo account.",
    jobTitle: "Technical Recruiter",
    location: "Remote",
    developerName: "Abdo Khater",
  },
  {
    username: "demo.engineer",
    email: "demo.engineer@egchat.local",
    about: "Demo teammate for chat, rooms, and call testing.",
    jobTitle: "Frontend Engineer",
    location: "Cairo, Egypt",
    developerName: "Abdo Khater",
  },
];

async function ensureDemoUser(profile) {
  const existingUser = await User.findOne({ email: profile.email });
  if (existingUser) {
    return User.findByIdAndUpdate(
      existingUser._id,
      { ...profile, status: true, displayname: "online" },
      { returnDocument: "after" }
    );
  }

  return User.create({
    ...profile,
    password: await hashPassword("EgchatDemo123!"),
    status: true,
    displayname: "online",
  });
}

export async function POST() {
  try {
    await connectDB();

    const [recruiter, engineer] = await Promise.all(
      demoUsers.map((profile) => ensureDemoUser(profile))
    );
    await ensurePublicRoom();

    const room = await Group.findOneAndUpdate(
      { name: "Egchat Demo Room" },
      {
        $setOnInsert: {
          name: "Egchat Demo Room",
          admin: recruiter._id,
          type: "group",
        },
        $addToSet: { members: { $each: [recruiter._id, engineer._id] } },
      },
      { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
    );

    const hasSeedMessage = await Messages.exists({
      chat: room.name,
      clientId: "egchat-demo-welcome",
    });

    if (!hasSeedMessage) {
      await Messages.create({
        clientId: "egchat-demo-welcome",
        sender: engineer.username,
        receiver: room.name,
        recname: room.name,
        chat: room.name,
        type: "group",
        avatar: engineer.avatar || "/avatar.jpg",
        message: "Welcome to the Egchat recruiter demo room.",
      });
    }

    const response = NextResponse.json(
      {
        message: "Demo login ready",
        user: sanitizeUser(recruiter),
      },
      { status: 200 }
    );

    setAuthCookie(response, recruiter);
    return response;
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Could not start demo login" },
      { status: 500 }
    );
  }
}
