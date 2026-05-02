import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req) {
  try {
    const body = await req.json();

    const {
      message,
      messages = [],
      mode = "chat",
    } = body || {};

    const apiKey = "AIzaSyBuNMciceG3dl7_pbVY-WpQ2GxZOm30rCY";

    if (!apiKey) {
      return Response.json(
        { message: "Missing GEMINI_API_KEY in .env.local" },
        { status: 500 }
      );
    }

    const userText =
      typeof message === "string" && message.trim()
        ? message.trim()
        : messages
            .filter((item) => item?.role === "user" && item?.content?.trim())
            .at(-1)
            ?.content?.trim();

    if (!userText) {
      return Response.json(
        { message: "Message is required." },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
      model: "gemini-flash-latest",
      systemInstruction: `
You are Nexchat AI Assistant.

You are helping normal users, not developers.
Be friendly, clear, and useful.
Do not mention API keys, backend details, or developer configuration unless the user asks.
Current mode: ${mode}.

Mode behavior:
- chat: answer normally and helpfully.
- reply: write natural message replies.
- translate: translate clearly and keep names unchanged.
      `,
    });

    const conversationText = messages
      .slice(-8)
      .map((item) => {
        const role = item.role === "assistant" ? "Assistant" : "User";
        return `${role}: ${item.content}`;
      })
      .join("\n\n");

    const prompt = conversationText
      ? `${conversationText}\n\nUser latest message: ${userText}`
      : userText;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return Response.json({
      text,
      reply: text,
    });
  } catch (err) {
    console.error("Gemini error:", err);

    return Response.json(
      {
        message: "Gemini error. Please try again.",
        error: err?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}