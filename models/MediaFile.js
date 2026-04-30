import mongoose from "mongoose";

const MediaFileSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: true,
      trim: true,
    },
    originalName: {
      type: String,
      default: "",
      trim: true,
    },
    contentType: {
      type: String,
      required: true,
      trim: true,
    },
    size: {
      type: Number,
      required: true,
    },
    bucket: {
      type: String,
      enum: ["avatar", "chat", "story", "group-avatar", "voice"],
      default: "chat",
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    data: {
      type: Buffer,
      required: true,
    },
  },
  { timestamps: true }
);

MediaFileSchema.index({ createdAt: -1 });
MediaFileSchema.index({ owner: 1, bucket: 1 });

export default mongoose.models.MediaFile ||
  mongoose.model("MediaFile", MediaFileSchema);
