import { NextResponse } from "next/server";
import twilio from "twilio";

const phoneNumberPattern = /^\+[1-9]\d{7,14}$/;

function cleanText(value = "") {
  return typeof value === "string" ? value.trim() : "";
}

function getCountryName(countryCode = "") {
  if (!countryCode) return "";

  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(countryCode) || "";
  } catch {
    return "";
  }
}

export async function GET(req) {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      return NextResponse.json(
        { message: "Twilio credentials are not configured" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const phone = cleanText(searchParams.get("phone"));

    if (!phoneNumberPattern.test(phone)) {
      return NextResponse.json(
        { message: "Use international phone format, like +201011396246" },
        { status: 400 }
      );
    }

    const client = twilio(accountSid, authToken);
    const lookup = await client.lookups.v2.phoneNumbers(phone).fetch({
      fields: "line_type_intelligence",
    });
    const countryName = getCountryName(lookup.countryCode);

    return NextResponse.json(
      {
        phoneNumber: lookup.phoneNumber || phone,
        nationalFormat: lookup.nationalFormat || "",
        countryCode: lookup.countryCode || "",
        countryName,
        callingCountryCode: lookup.callingCountryCode || "",
        valid: lookup.valid,
        carrierName: lookup.lineTypeIntelligence?.carrierName || "",
        lineType: lookup.lineTypeIntelligence?.type || "",
        locationLabel:
          countryName || lookup.countryCode
            ? [countryName, lookup.countryCode].filter(Boolean).join(" ")
            : "",
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
