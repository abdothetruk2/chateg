import mongoose from "mongoose";

const TwilioCallLogSchema = new mongoose.Schema(
  {
    ownerId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    ownerUsername: {
      type: String,
      default: "",
      trim: true,
    },
    to: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      default: "You have a new Nexchat notification",
      trim: true,
    },
    twilioSid: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: [
        "queued",
        "initiated",
        "ringing",
        "in-progress",
        "completed",
        "busy",
        "failed",
        "no-answer",
        "canceled",
      ],
      default: "queued",
    },
    errorMessage: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

TwilioCallLogSchema.index({ ownerId: 1, createdAt: -1 });
TwilioCallLogSchema.index({ to: 1, createdAt: -1 });

export default mongoose.models.TwilioCallLog ||
  mongoose.model("TwilioCallLog", TwilioCallLogSchema);
