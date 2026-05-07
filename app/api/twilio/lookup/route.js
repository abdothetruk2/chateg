import { NextResponse } from "next/server";
import twilio from "twilio";
import { getRequestUser } from "../../../../lib/auth";

const phoneNumberPattern = /^\+[1-9]\d{7,14}$/;

function cleanText(value = "") {
  return typeof value === "string" ? value.trim() : "";
}

function getCountryName(countryCode = "") {
  if (!countryCode) return "";

  try {
    return (
      new Intl.DisplayNames(["en"], { type: "region" }).of(countryCode) || ""
    );
  } catch {
    return "";
  }
}

export async function POST(req) {
  try {
    const user = getRequestUser(req);

    if (!user?._id) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    const accountSid = cleanText(process.env.TWILIO_ACCOUNT_SID);
    const authToken = cleanText(process.env.TWILIO_AUTH_TOKEN);

    if (!accountSid || !authToken) {
      return NextResponse.json(
        { message: "Twilio credentials are not configured" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const phoneNumber = cleanText(body.phoneNumber);

    if (!phoneNumberPattern.test(phoneNumber)) {
      return NextResponse.json(
        { message: "Use international phone format, like +201011396246" },
        { status: 400 }
      );
    }

    const client = twilio(accountSid, authToken);
    const lookup = await client.lookups.v2.phoneNumbers(phoneNumber).fetch({
      fields: "line_type_intelligence",
    });
    const countryName = getCountryName(lookup.countryCode);

    return NextResponse.json(
      {
        phoneNumber: lookup.phoneNumber || phoneNumber,
        nationalFormat: lookup.nationalFormat || "",
        countryCode: lookup.countryCode || "",
        country: countryName,
        callingCountryCode: lookup.callingCountryCode || "",
        valid: Boolean(lookup.valid),
        carrier: lookup.lineTypeIntelligence?.carrierName || "",
        lineType: lookup.lineTypeIntelligence?.type || "",
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Failed to look up phone number" },
      { status: 500 }
    );
  }
}
