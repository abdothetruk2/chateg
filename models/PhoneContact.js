import mongoose from "mongoose";

const PhoneContactSchema = new mongoose.Schema(
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
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

PhoneContactSchema.index({ ownerId: 1, phone: 1 }, { unique: true });
PhoneContactSchema.index({ ownerId: 1, name: 1 });

export default mongoose.models.PhoneContact ||
  mongoose.model("PhoneContact", PhoneContactSchema);
