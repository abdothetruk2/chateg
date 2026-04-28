import mongoose from "mongoose";

const GroupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,

      unique:true,
    },

    avatar: {
      type: String,
      default: "",
    },

    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    type: {
      type: String,
      default: "group",
    },
   approve: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },

   ],
    lastMessage: {
      text: String,
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      createdAt: Date,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Group ||
  mongoose.model("Group", GroupSchema);