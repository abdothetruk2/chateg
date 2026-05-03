import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const DEFAULT_IMAGE_MODEL = "gemini-latest-flash-image-preview";

function toImageUrl(data, mimeType = "image/png", uri = "") {
  if (data) {
    if (data.startsWith("data:") || data.startsWith("http")) return data;
    return `data:${mimeType};base64,${data}`;
  }

  return uri || "";
}

function extractImageResult(outputs = []) {
  let imageUrl = "";
  const textParts = [];

  for (const output of outputs) {
    if (!output) continue;

    if (output.type === "text" && output.text) {
      textParts.push(output.text);
    }

    if (output.type === "image") {
      imageUrl =
        toImageUrl(output.data, output.mime_type || "image/png", output.uri) ||
        imageUrl;
    }
  }

  return {
    imageUrl,
    text: textParts.join("\n").trim(),
  };
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { message: "Missing GEMINI_API_KEY in .env.local" },
        { status: 500 }
      );
    }

    if (!prompt) {
      return NextResponse.json(
        { message: "Image prompt is required." },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
    });

    const input = `
Create a high-quality image from this prompt:

${prompt}

Style:
- realistic
- high definition
- cinematic lighting
- clean composition
- no text watermark
    `.trim();

    const interaction = await ai.interactions.create({
      model: process.env.GEMINI_IMAGE_MODEL?.trim() || DEFAULT_IMAGE_MODEL,
      input,
      response_modalities: ["image"],
    });

    const { imageUrl, text } = extractImageResult(interaction?.outputs);

    if (!imageUrl) {
      return NextResponse.json(
        {
          message: "No image returned. Try a clearer prompt.",
          text,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      text: text || "Image generated successfully.",
      imageUrl,
    });
  } catch (error) {
    console.error("Gemini image error:", error);

    return NextResponse.json(
      {
        message: "Image generation failed. Please try again.",
        error: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
