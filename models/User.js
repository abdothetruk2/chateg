import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {

       



    username: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
      default: "/avatar.jpg",
    },
    status: {
      type: Boolean,
      default: false,
    },
    displayname: {
      type: String,
      default: "offline",
    },
    about:{

      type: String,
      default:"hey i am uses nexus"

    },
    themeMode: {
      type: String,
      enum: ["light", "dark", "system"],
      default: "dark",
    },
    themeColor: {
      type: String,
      default: "Cyan",
    },
    messageSounds: {
      type: Boolean,
      default: true,
    },
    callRingtone: {
      type: Boolean,
      default: true,
    },
     socketId:{
   
      type: String,
      default:"1232515"

    },
  friends: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }
  ],
  friendRequests: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }
  ],
  sentFriendRequests: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }
  ],

},

{timestamps: true}


);

const User = mongoose.models.User || mongoose.model("User", UserSchema);

export default User




