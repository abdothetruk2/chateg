import { GoogleGenAI, Modality } from "@google/genai";

export async function POST(req) {
  try {
    const { prompt } = await req.json();
const apikey="AIzaSyBuNMciceG3dl7_pbVY-WpQ2GxZOm30rCY"
    if (!apikey) {
      return Response.json(
        { message: "Missing GEMINI_API_KEY" },
        { status: 500 }
      );
    }

    if (!prompt?.trim()) {
      return Response.json(
        { message: "Image prompt is required." },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey: apikey,
    });

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image-preview",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `
Create a high-quality image from this prompt:

${prompt}

Style:
- realistic
- high definition
- cinematic lighting
- clean composition
- no text watermark
              `,
            },
          ],
        },
      ],
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    });

    let imageUrl = "";
    let text = "";

    const parts = response?.candidates?.[0]?.content?.parts || [];

    for (const part of parts) {
      if (part.text) {
        text += part.text;
      }

      if (part.inlineData?.data) {
        const mimeType = part.inlineData.mimeType || "image/png";
        imageUrl = `data:${mimeType};base64,${part.inlineData.data}`;
      }
    }

    if (!imageUrl) {
      return Response.json(
        {
          message: "No image returned. Try a clearer prompt.",
          text: text || "",
        },
        { status: 500 }
      );
    }

    return Response.json({
      text: text || "Image generated successfully.",
      imageUrl,
    });
  } catch (error) {
    console.error("Gemini image error:", error);

    return Response.json(
      {
        message: "Image generation failed. Please try again.",
        error: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}