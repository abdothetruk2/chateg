import { NextResponse } from "next/server";
import twilio from "twilio";
import { getRequestUser } from "../../../../lib/auth";
import connectDB from "../../../../lib/mongoose";
import TwilioCallLog from "../../../../models/TwilioCallLog";

const phoneNumberPattern = /^\+[1-9]\d{7,14}$/;
const defaultCallMessage = "You have a new Nexchat notification";

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
  const message = cleanText(body.message).slice(0, 500) || defaultCallMessage;

  if (!phoneNumberPattern.test(to)) {
    return NextResponse.json(
      { message: "Use international phone format, like +201011396246" },
      { status: 400 }
    );
  }

  const accountSid = cleanText(process.env.TWILIO_ACCOUNT_SID);
  const authToken = cleanText(process.env.TWILIO_AUTH_TOKEN);
  const from = getTwilioPhoneNumber();

  if (!accountSid || !authToken || !from) {
    return NextResponse.json(
      { message: "Twilio call credentials are not configured" },
      { status: 500 }
    );
  }

  await connectDB();

  try {
    const voiceResponse = new twilio.twiml.VoiceResponse();
    voiceResponse.say({ voice: "alice" }, message);

    const client = twilio(accountSid, authToken);
    const call = await client.calls.create({
      to,
      from,
      twiml: voiceResponse.toString(),
    });

    const log = await TwilioCallLog.create({
      ownerId: user._id,
      ownerUsername: user.username || "",
      to,
      message,
      twilioSid: call.sid || "",
      status: call.status || "queued",
    });

    return NextResponse.json(
      {
        success: true,
        sid: call.sid,
        status: call.status || "queued",
        log,
      },
      { status: 201 }
    );
  } catch (error) {
    const log = await TwilioCallLog.create({
      ownerId: user._id,
      ownerUsername: user.username || "",
      to,
      message,
      status: "failed",
      errorMessage: error.message || "Failed to start phone call",
    });

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to start phone call",
        log,
      },
      { status: 500 }
    );
  }
}
