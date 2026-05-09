import { NextResponse } from "next/server";

const DEFAULT_PRESCRIPTOAI_VALIDATE_URL =
  "https://www.prescriptoai.com/api/v1/prescription/validate";
const MAX_FILE_BYTES = 12 * 1024 * 1024;

function splitMedicineValues(values) {
  return values
    .flatMap((value) => String(value || "").split(/[\n,]/))
    .map((value) => value.trim())
    .filter(Boolean);
}

function getMedicineNames(formData) {
  const values = [
    ...formData.getAll("medicines"),
    formData.get("medicinesText"),
    formData.get("medicine"),
    formData.get("medicineNames"),
  ].filter((value) => typeof value === "string");

  return Array.from(new Set(splitMedicineValues(values)));
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
    "Prescription validation request failed."
  );
}

function formatBoolean(value) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "Unknown";
}

function formatValidation(data) {
  const result = data?.data || data;
  const validations = result?.validations || {};
  const medicinesIncluded = validations?.medicinesIncluded;
  const medicinesDetails = medicinesIncluded?.details || {};
  const patientValidation = validations?.patientName || validations?.patient || {};
  const medicineRows = Array.isArray(result?.medicinesFound)
    ? result.medicinesFound
    : [];
  const foundMedicines =
    medicinesDetails.foundMedicines ||
    medicineRows.filter((item) => item?.found).map((item) => item.name);
  const missingMedicines =
    medicinesDetails.missingMedicines ||
    medicineRows.filter((item) => item?.found === false).map((item) => item.name);
  const isValid = result?.isValid ?? validations?.overall?.valid;
  const patientMatch = result?.patientMatch ?? patientValidation?.valid;
  const confidence =
    result?.confidence ?? validations?.overall?.confidence ?? data?.confidence;
  const lines = ["Prescription validation result"];

  lines.push(`Valid prescription: ${formatBoolean(isValid)}`);
  lines.push(`Patient match: ${formatBoolean(patientMatch)}`);

  if (confidence !== undefined && confidence !== null) {
    lines.push(`Confidence: ${confidence}`);
  }

  if (medicineRows.length) {
    lines.push("");
    lines.push("Medicine checks:");
    medicineRows.forEach((item, index) => {
      lines.push(
        `${index + 1}. ${item?.name || "Medicine"}: ${
          item?.found ? "Found" : "Missing"
        }`
      );
    });
  }

  if (foundMedicines?.length) {
    lines.push("");
    lines.push(`Found medicines: ${foundMedicines.join(", ")}`);
  }

  if (missingMedicines?.length) {
    lines.push(`Missing medicines: ${missingMedicines.join(", ")}`);
  }

  if (medicinesDetails?.notes) {
    lines.push("");
    lines.push(`Notes: ${medicinesDetails.notes}`);
  }

  return lines.join("\n");
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
    const patientName = String(formData.get("patientName") || "").trim();
    const medicines = getMedicineNames(formData);

    if (!file || typeof file === "string" || !file.arrayBuffer) {
      return NextResponse.json(
        { message: "Prescription image or PDF is required." },
        { status: 400 }
      );
    }

    if (!patientName) {
      return NextResponse.json(
        { message: "Patient name is required." },
        { status: 400 }
      );
    }

    if (!medicines.length) {
      return NextResponse.json(
        { message: "At least one medicine is required." },
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
    upstreamForm.append("patientName", patientName);
    medicines.forEach((medicine) => upstreamForm.append("medicines", medicine));

    const response = await fetch(
      process.env.PRESCRIPTOAI_VALIDATE_API_URL?.trim() ||
        DEFAULT_PRESCRIPTOAI_VALIDATE_URL,
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
      message: "Prescription validated successfully.",
      text: formatValidation(data),
      validation: data?.data || data,
      prescription: data,
    });
  } catch (error) {
    console.error("PrescriptoAI validation error:", error);

    return NextResponse.json(
      {
        message: "Prescription validation failed. Please try again.",
        error: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
