import mongoose from "mongoose";

const StorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    mediaUrl: {
      type: String,
      required: true,
    },

    caption: {
      type: String,
      default: "",
    },

    viewers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    replies: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        message: {
          type: String,
          required: true,
          trim: true,
        },
        messageId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Messages",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    expiresAt: {
      type: Date,
      required: true,
      expires: 0, // 👈 TTL delete when date reached
    },
  },
  {
    timestamps: true, // 👈 تتحط هنا مش جوه fields
  }
);

export default mongoose.models.Story || mongoose.model("Story", StorySchema);
