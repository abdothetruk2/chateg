import mongoose from "mongoose";

const LiveLocationSchema = new mongoose.Schema(
  {
    ownerId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    ownerUsername: {
      type: String,
      required: true,
      trim: true,
    },
    receiver: {
      type: String,
      required: true,
      trim: true,
    },
    recname: {
      type: String,
      default: "",
      trim: true,
    },
    chat: {
      type: String,
      default: "",
      trim: true,
    },
    type: {
      type: String,
      enum: ["user", "group"],
      default: "user",
    },
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },
    accuracy: {
      type: Number,
      default: null,
    },
    isLive: {
      type: Boolean,
      default: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    stoppedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

LiveLocationSchema.index({ ownerId: 1, receiver: 1, type: 1, isLive: 1 });
LiveLocationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.LiveLocation ||
  mongoose.model("LiveLocation", LiveLocationSchema);
