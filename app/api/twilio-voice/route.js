import { NextResponse } from "next/server";
import twilio from "twilio";

const phoneNumberPattern = /^\+[1-9]\d{7,14}$/;

function cleanText(value = "") {
  return typeof value === "string" ? value.trim() : "";
}

function isEnabled(value = "") {
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function xmlResponse(twiml, status = 200) {
  return new NextResponse(twiml, {
    status,
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
    },
  });
}

export async function POST(req) {
  const voiceResponse = new twilio.twiml.VoiceResponse();

  try {
    const from = cleanText(process.env.TWILIO_FROM_NUMBER);
    const params = new URLSearchParams(await req.text());
    const to = cleanText(params.get("To"));
    const shouldRecord = isEnabled(params.get("Record"));

    if (!from) {
      voiceResponse.say("Twilio caller ID is not configured.");
      voiceResponse.hangup();
      return xmlResponse(voiceResponse.toString(), 500);
    }

    if (!phoneNumberPattern.test(to)) {
      voiceResponse.say("Invalid phone number.");
      voiceResponse.hangup();
      return xmlResponse(voiceResponse.toString(), 400);
    }

    const dialOptions = {
      answerOnBridge: true,
      callerId: from,
    };

    if (shouldRecord) {
      dialOptions.record = "record-from-answer-dual";
      dialOptions.recordingTrack = "both";
    }

    const dial = voiceResponse.dial(dialOptions);
    dial.number(to);

    return xmlResponse(voiceResponse.toString());
  } catch {
    voiceResponse.say("Unable to connect the call.");
    voiceResponse.hangup();
    return xmlResponse(voiceResponse.toString(), 500);
  }
}
