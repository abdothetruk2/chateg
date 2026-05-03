import Group from "../models/Group";
import Messages from "../models/Messages";
import User from "../models/User";

export const PUBLIC_ROOM_NAME = "Public Chat";
export const PUBLIC_ROOM_DESCRIPTION = "Open room for every Egchat member.";

export async function ensurePublicRoom() {
  const users = await User.find().select("_id username avatar").sort({
    createdAt: 1,
    _id: 1,
  });

  if (users.length === 0) return null;

  const memberIds = users.map((user) => user._id);
  const admin = users[0];

  const room = await Group.findOneAndUpdate(
    { name: PUBLIC_ROOM_NAME },
    {
      $setOnInsert: {
        name: PUBLIC_ROOM_NAME,
        admin: admin._id,
        avatar: "",
      },
      $set: {
        type: "group",
        isPublic: true,
        description: PUBLIC_ROOM_DESCRIPTION,
      },
      $addToSet: {
        members: { $each: memberIds },
      },
      $pull: {
        approve: { $in: memberIds },
      },
    },
    { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
  );

  const hasWelcomeMessage = await Messages.exists({
    chat: PUBLIC_ROOM_NAME,
    clientId: "egchat-public-room-welcome",
  });

  if (!hasWelcomeMessage) {
    await Messages.create({
      clientId: "egchat-public-room-welcome",
      sender: admin.username,
      receiver: PUBLIC_ROOM_NAME,
      recname: PUBLIC_ROOM_NAME,
      chat: PUBLIC_ROOM_NAME,
      type: "group",
      avatar: admin.avatar || "/avatar.jpg",
      message: "Welcome to Public Chat. Everyone in Egchat can read and send messages here.",
    });
  }

  return room;
}

export async function ensurePublicRoomIncludesUser(userId) {
  if (!userId) return null;

  const room = await ensurePublicRoom();
  if (!room) return null;

  return Group.findByIdAndUpdate(
    room._id,
    {
      $addToSet: { members: userId },
      $pull: { approve: userId },
    },
    { returnDocument: "after" }
  );
}
