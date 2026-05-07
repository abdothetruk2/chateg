import mongoose from "mongoose";

const SmsLogSchema = new mongoose.Schema(
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
    body: {
      type: String,
      required: true,
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
        "accepted",
        "queued",
        "sending",
        "sent",
        "delivered",
        "undelivered",
        "failed",
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

SmsLogSchema.index({ ownerId: 1, createdAt: -1 });
SmsLogSchema.index({ to: 1, createdAt: -1 });

export default mongoose.models.SmsLog ||
  mongoose.model("SmsLog", SmsLogSchema);
