import { NextResponse } from "next/server";

const DEFAULT_PRESCRIPTOAI_URL =
  "https://www.prescriptoai.com/api/v1/prescription/extract";
const MAX_FILE_BYTES = 12 * 1024 * 1024;

function getMedicines(data) {
  if (Array.isArray(data?.medicines)) return data.medicines;
  if (Array.isArray(data?.medications)) return data.medications;
  if (Array.isArray(data?.drugs)) return data.drugs;
  if (Array.isArray(data?.data?.medicines)) return data.data.medicines;
  if (Array.isArray(data?.data?.medications)) return data.data.medications;
  if (Array.isArray(data?.prescription?.medications)) {
    return data.prescription.medications;
  }
  if (Array.isArray(data?.data?.prescription?.medications)) {
    return data.data.prescription.medications;
  }
  if (Array.isArray(data?.result?.medicines)) return data.result.medicines;
  if (Array.isArray(data?.result?.medications)) return data.result.medications;

  return [];
}

function pickValue(source, keys) {
  for (const key of keys) {
    const value = source?.[key];

    if (value === null || value === undefined || value === "") continue;
    if (typeof value === "object") return JSON.stringify(value);

    return String(value);
  }

  return "";
}

function formatPrescription(data) {
  const source = data?.data || data;
  const medicines = getMedicines(data);
  const lines = ["Prescription reader result"];

  const patient =
    typeof source?.patient === "object"
      ? pickValue(source.patient, ["name", "patientName", "patient_name"])
      : pickValue(source, ["patient", "patientName", "patient_name"]);
  const date = pickValue(source, ["date", "prescriptionDate", "prescription_date"]);
  const doctor =
    typeof source?.doctor === "object"
      ? pickValue(source.doctor, ["name", "doctorName", "doctor_name"])
      : pickValue(source, ["doctor", "doctorName", "doctor_name"]);

  if (patient) lines.push(`Patient: ${patient}`);
  if (doctor) lines.push(`Doctor: ${doctor}`);
  if (date) lines.push(`Date: ${date}`);

  if (!medicines.length) {
    lines.push("");
    lines.push("No medicines or doses were found in the response.");
    return lines.join("\n");
  }

  lines.push("");
  lines.push("Medicines and doses:");

  medicines.forEach((medicine, index) => {
    const name =
      pickValue(medicine, [
        "name",
        "medicine",
        "medicine_name",
        "medication",
        "drug",
        "drug_name",
      ]) || `Medicine ${index + 1}`;
    const dose = pickValue(medicine, ["dosage", "dose", "strength"]);
    const frequency = pickValue(medicine, ["frequency", "freq"]);
    const duration = pickValue(medicine, ["duration", "days"]);
    const instructions = pickValue(medicine, [
      "instructions",
      "instruction",
      "sig",
      "route",
      "notes",
    ]);

    lines.push(`${index + 1}. ${name}`);
    if (dose) lines.push(`   Dose: ${dose}`);
    if (frequency) lines.push(`   Frequency: ${frequency}`);
    if (duration) lines.push(`   Duration: ${duration}`);
    if (instructions) lines.push(`   Instructions: ${instructions}`);
  });

  return lines.join("\n");
}

async function readResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return {
    message: await response.text(),
  };
}

function getErrorMessage(data) {
  return (
    data?.message ||
    data?.error ||
    data?.detail ||
    "Prescription reader request failed."
  );
}

function getApiKey(req) {
  const authorization = req.headers.get("authorization") || "";
  const bearerToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();

  return bearerToken || process.env.PRESCRIPTOAI_API_KEY?.trim();
}

export async function POST(req) {
  try {
    const apiKey = getApiKey(req);

    if (!apiKey) {
      return NextResponse.json(
        {
          message:
            "Missing PRESCRIPTOAI_API_KEY in .env.local or Authorization bearer token.",
        },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file =
      formData.get("prescription") || formData.get("image") || formData.get("file");

    if (!file || typeof file === "string" || !file.arrayBuffer) {
      return NextResponse.json(
        { message: "Prescription image or PDF is required." },
        { status: 400 }
      );
    }

    const fileType = String(file.type || "").toLowerCase();
    const fileName = String(file.name || "prescription");
    const isImage = fileType.startsWith("image/");
    const isPdf = fileType === "application/pdf" || /\.pdf$/i.test(fileName);

    if (!isImage && !isPdf) {
      return NextResponse.json(
        { message: "Upload a prescription image or PDF." },
        { status: 400 }
      );
    }

    if (file.size && file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { message: "Prescription file must be 12 MB or smaller." },
        { status: 400 }
      );
    }

    const upstreamForm = new FormData();
    upstreamForm.append("prescription", file, fileName);

    const response = await fetch(
      process.env.PRESCRIPTOAI_API_URL?.trim() || DEFAULT_PRESCRIPTOAI_URL,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: upstreamForm,
      }
    );

    const data = await readResponse(response);

    if (!response.ok) {
      return NextResponse.json(
        {
          message: getErrorMessage(data),
          error: data,
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      message: "Prescription read successfully.",
      text: formatPrescription(data),
      medicines: getMedicines(data),
      prescription: data,
    });
  } catch (error) {
    console.error("PrescriptoAI error:", error);

    return NextResponse.json(
      {
        message: "Prescription reader failed. Please try again.",
        error: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
