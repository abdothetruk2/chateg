import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    sender: { type: String, required: true },
    receiver: { type: String, default: "" },
    recname: { type: String, default: "" },
    chat: { type: String, default: "" },
    message: { type: String, default: "" },
    media: { type: String, default: "" },
    mediaType: { type: String, default: "" },
    read:{type:Boolean,default:false},
    type: {
      type: String,
      enum: ["user", "group", "location"],
      default: "user",
    },
    conversationType: {
      type: String,
      enum: ["user", "group"],
      default: "user",
    },
    latitude: { type: Number },
    longitude: { type: Number },
    accuracy: { type: Number, default: null },
    avatar: { type: String, default: "" },
    clientId: { type: String, default: "" },
    reactions: [
      {
        user: { type: String, required: true },
        emoji: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    storyReply: {
      storyId: { type: mongoose.Schema.Types.ObjectId, ref: "Story" },
      mediaUrl: { type: String, default: "" },
      mediaType: { type: String, default: "" },
      caption: { type: String, default: "" },
      owner: { type: String, default: "" },
    },
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
      accuracy: { type: Number },
      isLive: { type: Boolean, default: false },
      shareId: { type: String, default: "" },
      expiresAt: { type: Date },
    },
  },
  { timestamps: true }
);

export default mongoose.models.Messages ||
  mongoose.model("Messages", MessageSchema);
