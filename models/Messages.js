import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    sender: { type: String, required: true },
    receiver: { type: String, default: "" },
    recname: { type: String, default: "" },
    chat: { type: String, default: "" },
    message: { type: String, default: "" },
    media: { type: String, default: "" },
    read:{type:Boolean,default:false},
    type: {
      type: String,
      enum: ["user", "group"],
      default: "user",
    },
    avatar: { type: String, default: "" },
    clientId: { type: String, default: "" },
    storyReply: {
      storyId: { type: mongoose.Schema.Types.ObjectId, ref: "Story" },
      mediaUrl: { type: String, default: "" },
      caption: { type: String, default: "" },
      owner: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

export default mongoose.models.Messages ||
  mongoose.model("Messages", MessageSchema);
