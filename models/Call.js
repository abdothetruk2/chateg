import mongoose from "mongoose";

const CallSchema = new mongoose.Schema(
  {
    caller: {
      type: String,
      required: true,
      trim: true,
    },
    receiver: {
      type: String,
      default: "",
      trim: true,
    },
    room: {
      type: String,
      default: "",
      trim: true,
    },
    scope: {
      type: String,
      enum: ["direct", "group"],
      default: "direct",
    },
    callType: {
      type: String,
      enum: ["audio", "video"],
      default: "video",
    },
    status: {
      type: String,
      enum: ["ringing", "accepted", "ended", "missed", "declined", "failed"],
      default: "ringing",
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    answeredAt: {
      type: Date,
    },
    endedAt: {
      type: Date,
    },
    durationSeconds: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

CallSchema.index({ caller: 1, createdAt: -1 });
CallSchema.index({ receiver: 1, createdAt: -1 });
CallSchema.index({ room: 1, createdAt: -1 });

export default mongoose.models.Call || mongoose.model("Call", CallSchema);
