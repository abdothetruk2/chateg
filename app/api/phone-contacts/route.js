import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { getRequestUser } from "../../../lib/auth";
import connectDB from "../../../lib/mongoose";
import PhoneContact from "../../../models/PhoneContact";

const phoneNumberPattern = /^\+[1-9]\d{7,14}$/;

function cleanText(value = "") {
  return typeof value === "string" ? value.trim() : "";
}

function getAuthenticatedUser(req) {
  const user = getRequestUser(req);
  return user?._id ? user : null;
}

export async function GET(req) {
  try {
    const user = getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    const contacts = await PhoneContact.find({ ownerId: user._id })
      .sort({ name: 1, createdAt: -1 })
      .lean();

    return NextResponse.json({ contacts }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Failed to fetch contacts" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const user = getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const name = cleanText(body.name);
    const phone = cleanText(body.phone);

    if (!name || !phone) {
      return NextResponse.json(
        { message: "Contact name and phone number are required" },
        { status: 400 }
      );
    }

    if (!phoneNumberPattern.test(phone)) {
      return NextResponse.json(
        { message: "Use international phone format, like +201011396246" },
        { status: 400 }
      );
    }

    await connectDB();

    const contact = await PhoneContact.findOneAndUpdate(
      { ownerId: user._id, phone },
      {
        ownerId: user._id,
        ownerUsername: user.username || "",
        name,
        phone,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    return NextResponse.json({ contact }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Failed to save contact" },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    const user = getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const id = cleanText(body.id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Valid contact id is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const contact = await PhoneContact.findOneAndDelete({
      _id: id,
      ownerId: user._id,
    }).lean();

    if (!contact) {
      return NextResponse.json(
        { message: "Contact not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Contact deleted", id },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Failed to delete contact" },
      { status: 500 }
    );
  }
}
