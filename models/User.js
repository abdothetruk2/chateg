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
    },
    provider: {
      type: String,
      default: "local",
      trim: true,
    },
    oauthProvider: {
      type: String,
      default: "",
      trim: true,
    },
    oauthId: {
      type: String,
      default: "",
      trim: true,
    },
    avatar: {
      type: String,
      default: "/avatar.jpg",
    },
    coverPhoto: {
      type: String,
      default: "",
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
      default:"Hey there! I am using Egchat."

    },
    jobTitle: {
      type: String,
      default: "",
      trim: true,
    },
    location: {
      type: String,
      default: "",
      trim: true,
    },
    developerName: {
      type: String,
      default: "Abdo Khater",
      trim: true,
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

UserSchema.index(
  { oauthProvider: 1, oauthId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      oauthProvider: { $type: "string", $gt: "" },
      oauthId: { $type: "string", $gt: "" },
    },
  }
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);

export default User




