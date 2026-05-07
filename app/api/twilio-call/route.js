import { NextResponse } from "next/server";
import twilio from "twilio";

function cleanText(value = "") {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(req) {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      return NextResponse.json(
        { message: "Twilio credentials are not configured" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const from = cleanText(process.env.TWILIO_FROM_NUMBER);
    const to = cleanText(body.to);
    const shouldRecord = Boolean(body.record);
    const url =
      cleanText(process.env.TWILIO_VOICE_URL) ||
      "http://demo.twilio.com/docs/voice.xml";

    if (!from) {
      return NextResponse.json(
        { message: "Twilio from number is not configured" },
        { status: 500 }
      );
    }

    if (!to) {
      return NextResponse.json(
        { message: "to phone number is required" },
        { status: 400 }
      );
    }

    const client = twilio(accountSid, authToken);
    const callPayload = {
      from,
      to,
      url,
    };

    if (shouldRecord) {
      callPayload.record = true;
      callPayload.recordingTrack = "both";
      callPayload.recordingChannels = "dual";
    }

    const call = await client.calls.create(callPayload);

    return NextResponse.json(
      { sid: call.sid, recording: shouldRecord },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Failed to create Twilio call" },
      { status: 500 }
    );
  }
}
