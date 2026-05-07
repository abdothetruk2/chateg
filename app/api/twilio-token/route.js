import { NextResponse } from "next/server";
import twilio from "twilio";
import { getRequestUser } from "../../../lib/auth";

const voiceConfigFields = {
  accountSid: "TWILIO_ACCOUNT_SID",
  apiKey: "TWILIO_API_KEY",
  apiSecret: "TWILIO_API_SECRET",
  twimlAppSid: "TWILIO_TWIML_APP_SID",
};

function cleanText(value = "") {
  return typeof value === "string" ? value.trim() : "";
}

function cleanIdentity(value = "") {
  const identity = String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 80);

  return identity || "egchat_user";
}

function getVoiceConfig() {
  const config = Object.fromEntries(
    Object.entries(voiceConfigFields).map(([key, envName]) => [
      key,
      cleanText(process.env[envName]),
    ])
  );
  const missing = Object.entries(voiceConfigFields)
    .filter(([key]) => !config[key])
    .map(([, envName]) => envName);

  return { ...config, missing };
}

export async function POST(req) {
  try {
    const user = getRequestUser(req);
    const { accountSid, apiKey, apiSecret, twimlAppSid, missing } =
      getVoiceConfig();

    if (!user?._id) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    if (missing.length > 0) {
      const message =
        process.env.NODE_ENV === "production"
          ? "Twilio Voice SDK credentials are not configured"
          : `Twilio Voice SDK credentials are not configured. Missing: ${missing.join(
              ", "
            )}`;

      return NextResponse.json(
        {
          message,
          code: "TWILIO_VOICE_CONFIG_MISSING",
          missing,
        },
        { status: 500 }
      );
    }

    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;
    const identity = cleanIdentity(user.username || user._id);
    const token = new AccessToken(accountSid, apiKey, apiSecret, {
      identity,
      ttl: 3600,
    });
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: twimlAppSid,
      incomingAllow: false,
    });

    token.addGrant(voiceGrant);

    return NextResponse.json(
      { token: token.toJwt(), identity },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Failed to create voice token" },
      { status: 500 }
    );
  }
}
