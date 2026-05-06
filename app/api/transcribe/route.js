import { NextResponse } from "next/server";

const ASSEMBLYAI_BASE_URL = "https://api.assemblyai.com";
const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 30;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readAssemblyResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      data?.error || data?.message || "AssemblyAI request failed.";
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return data;
}

export async function POST(req) {
  try {
    const apiKey = process.env.ASSEMBLYAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { message: "Missing ASSEMBLYAI_API_KEY in .env" },
        { status: 500 }
      );
    }

    let formData;

    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json(
        { message: "Audio form data is required." },
        { status: 400 }
      );
    }

    const file = formData.get("file");

    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json(
        { message: "Audio file is required." },
        { status: 400 }
      );
    }

    const fileSize = Number(file.size || 0);

    if (!fileSize) {
      return NextResponse.json(
        { message: "Audio file is empty." },
        { status: 400 }
      );
    }

    if (fileSize > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { message: "Audio file is too large." },
        { status: 413 }
      );
    }

    const audioBuffer = Buffer.from(await file.arrayBuffer());
    const headers = { Authorization: apiKey };

    const uploadResponse = await fetch(`${ASSEMBLYAI_BASE_URL}/v2/upload`, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/octet-stream",
      },
      body: audioBuffer,
    });
    const uploadData = await readAssemblyResponse(uploadResponse);

    const transcriptResponse = await fetch(
      `${ASSEMBLYAI_BASE_URL}/v2/transcript`,
      {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          audio_url: uploadData.upload_url,
          speech_models: ["universal-3-pro", "universal-2"],
          language_code: "ar",
          punctuate: true,
          format_text: true,
        }),
      }
    );
    const transcriptData = await readAssemblyResponse(transcriptResponse);
    const transcriptId = transcriptData.id;

    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
      await wait(POLL_INTERVAL_MS);

      const pollingResponse = await fetch(
        `${ASSEMBLYAI_BASE_URL}/v2/transcript/${transcriptId}`,
        { headers }
      );
      const pollingData = await readAssemblyResponse(pollingResponse);

      if (pollingData.status === "completed") {
        return NextResponse.json({
          text: pollingData.text || "",
          id: transcriptId,
          languageCode: pollingData.language_code || "",
          confidence: pollingData.confidence || null,
        });
      }

      if (pollingData.status === "error") {
        return NextResponse.json(
          {
            message: pollingData.error || "Transcription failed.",
          },
          { status: 502 }
        );
      }
    }

    return NextResponse.json(
      { message: "Transcription is still processing. Try a shorter clip." },
      { status: 504 }
    );
  } catch (error) {
    console.error("POST /api/transcribe error:", error);

    return NextResponse.json(
      {
        message: error?.message || "Transcription failed. Please try again.",
      },
      { status: error?.status || 500 }
    );
  }
}
