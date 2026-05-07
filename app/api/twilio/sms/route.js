import { NextResponse } from "next/server";
import twilio from "twilio";
import { getRequestUser } from "../../../../lib/auth";
import connectDB from "../../../../lib/mongoose";
import SmsLog from "../../../../models/SmsLog";

const phoneNumberPattern = /^\+[1-9]\d{7,14}$/;

function cleanText(value = "") {
  return typeof value === "string" ? value.trim() : "";
}

function getTwilioPhoneNumber() {
  return cleanText(
    process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_FROM_NUMBER
  );
}

export async function POST(req) {
  const user = getRequestUser(req);

  if (!user?._id) {
    return NextResponse.json(
      { message: "Authentication required" },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const to = cleanText(body.phoneNumber || body.to);
  const message = cleanText(body.message).slice(0, 1600);

  if (!phoneNumberPattern.test(to)) {
    return NextResponse.json(
      { message: "Use international phone format, like +201011396246" },
      { status: 400 }
    );
  }

  if (!message) {
    return NextResponse.json(
      { message: "SMS message is required" },
      { status: 400 }
    );
  }

  const accountSid = cleanText(process.env.TWILIO_ACCOUNT_SID);
  const authToken = cleanText(process.env.TWILIO_AUTH_TOKEN);
  const from = getTwilioPhoneNumber();

  if (!accountSid || !authToken || !from) {
    return NextResponse.json(
      { message: "Twilio SMS credentials are not configured" },
      { status: 500 }
    );
  }

  await connectDB();

  try {
    const client = twilio(accountSid, authToken);
    const sms = await client.messages.create({
      to,
      from,
      body: message,
    });

    const log = await SmsLog.create({
      ownerId: user._id,
      ownerUsername: user.username || "",
      to,
      body: message,
      twilioSid: sms.sid || "",
      status: sms.status || "queued",
    });

    return NextResponse.json(
      {
        success: true,
        sid: sms.sid,
        status: sms.status || "queued",
        log,
      },
      { status: 201 }
    );
  } catch (error) {
    const log = await SmsLog.create({
      ownerId: user._id,
      ownerUsername: user.username || "",
      to,
      body: message,
      status: "failed",
      errorMessage: error.message || "Failed to send SMS",
    });

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to send SMS",
        log,
      },
      { status: 500 }
    );
  }
}
