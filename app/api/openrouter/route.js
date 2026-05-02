import { NextResponse } from "next/server";
import { z } from "zod";

const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-4o";
const MODEL_ID_PATTERN = /^[a-z0-9][a-z0-9_.-]*\/[a-z0-9][a-z0-9_.:-]*$/i;

const assistantModes = {
  chat: "You are Egchat AI, a concise assistant for a real-time chat workspace. Give direct, useful answers.",
  summarize:
    "Summarize pasted conversations into concise bullets, decisions, action items, owners, and open questions. Do not invent details.",
  reply:
    "Draft natural chat replies. Offer polished options with different tones when useful.",
  translate:
    "Translate chat messages accurately while preserving tone, names, formatting, and intent.",
  code: "Explain code, find likely bugs, and suggest focused fixes. Keep examples practical and in JavaScript unless asked otherwise.",
  weather:
    "Answer weather questions by using the get_weather tool when a location is available.",
};

const suggestedModels = [
  "openai/gpt-4o",
  "openai/gpt-4o-mini",
  "anthropic/claude-sonnet-4",
  "google/gemini-2.5-flash",
  "meta-llama/llama-3.3-70b-instruct",
];

const chatMessageSchema = z.object({
  role: z.enum(["system", "developer", "user", "assistant"]),
  content: z.string().min(1),
});

const requestSchema = z
  .object({
    mode: z.enum(Object.keys(assistantModes)).optional(),
    prompt: z.string().min(1).optional(),
    model: z.string().trim().min(1).optional(),
    messages: z.array(chatMessageSchema).min(1).optional(),
    systemPrompt: z.string().min(1).max(2000).optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxOutputTokens: z.number().int().min(64).max(4096).optional(),
  })
  .refine((value) => value.prompt || value.messages, {
    message: "Send either prompt or messages.",
  });

const weatherToolDefinition = {
  type: "function",
  function: {
    name: "get_weather",
    description: "Get the current weather for a location",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "City name",
        },
      },
      required: ["location"],
      additionalProperties: false,
    },
  },
};

function getWeather({ location }) {
  return { temperature: 72, condition: "sunny", location };
}

function getMessages({ prompt, messages }) {
  if (messages) {
    return messages.map((message) => ({
      role: message.role === "developer" ? "system" : message.role,
      content: message.content,
    }));
  }

  return [{ role: "user", content: prompt }];
}

function buildMessages(data) {
  const mode = data.mode || "chat";
  const instructions = [assistantModes[mode], data.systemPrompt]
    .filter(Boolean)
    .join("\n\n");

  return [{ role: "system", content: instructions }, ...getMessages(data)];
}

function resolveModel(model) {
  return model?.trim() || DEFAULT_MODEL;
}

function modelIdIsValid(model) {
  return MODEL_ID_PATTERN.test(model);
}

function parseToolArguments(value) {
  if (!value) return {};

  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function getLastUserContent(messages) {
  return [...messages].reverse().find((message) => message.role === "user")
    ?.content;
}

function inferLocationFromText(text = "") {
  const match = text.match(
    /\b(?:in|for|at)\s+([a-z][a-z\s,.'-]{1,80}?)(?:[?.!]|$)/i
  );

  return match?.[1]?.trim().replace(/[?.!,]+$/, "") || "";
}

function shouldReplaceLocation(location) {
  return !location || /^\[?(address|location|city)\]?$/i.test(location.trim());
}

function getOpenRouterError(error, fallback = "OpenRouter request failed.") {
  if (!error || typeof error !== "object") return fallback;

  if (typeof error.message === "string") return error.message;
  if (typeof error.error?.message === "string") return error.error.message;

  return fallback;
}

function logOpenRouterError(error) {
  const status = error?.status || error?.statusCode || "unknown";
  const message = getOpenRouterError(error);
  console.error("OpenRouter call failed:", { status, message });
}

async function sendOpenRouterRequest({
  model,
  messages,
  temperature,
  maxTokens,
  toolChoice = "auto",
}) {
  const toolsEnabled = toolChoice !== "none";
  const response = await fetch(OPENROUTER_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "",
      "X-OpenRouter-Title": "Egchat",
    },
    body: JSON.stringify({
      model,
      messages,
      ...(toolsEnabled ? { tools: [weatherToolDefinition] } : {}),
      tool_choice: toolChoice,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(getOpenRouterError(data));
    error.status = response.status;
    error.body = data;
    throw error;
  }

  return data;
}

async function completeWithTools({
  model,
  messages,
  temperature,
  maxTokens,
  forceToolName,
}) {
  const firstResponse = await sendOpenRouterRequest({
    model,
    messages,
    temperature,
    maxTokens,
    toolChoice: forceToolName
      ? { type: "function", function: { name: forceToolName } }
      : "auto",
  });
  const firstMessage = firstResponse?.choices?.[0]?.message || {};
  const toolCalls = Array.isArray(firstMessage.tool_calls)
    ? firstMessage.tool_calls
    : [];

  if (toolCalls.length === 0) {
    return {
      text: firstMessage.content || "",
      model: firstResponse.model || model,
      toolCalls: [],
    };
  }

  const executedToolCalls = [];
  const inferredLocation = inferLocationFromText(getLastUserContent(messages));
  const toolMessages = toolCalls.map((toolCall) => {
    const args = parseToolArguments(toolCall.function?.arguments);
    const name = toolCall.function?.name || "tool";

    if (name === "get_weather" && shouldReplaceLocation(args.location)) {
      args.location = inferredLocation || args.location || "Unknown";
    }

    const result =
      name === "get_weather"
        ? getWeather(args)
        : { error: "Unknown tool" };

    executedToolCalls.push({
      id: toolCall.id,
      name,
      arguments: args,
    });

    return {
      role: "tool",
      tool_call_id: toolCall.id,
      name,
      content: JSON.stringify(result),
    };
  });
  const assistantToolMessage = {
    ...firstMessage,
    tool_calls: toolCalls.map((toolCall, index) => ({
      ...toolCall,
      function: {
        ...toolCall.function,
        arguments: JSON.stringify(executedToolCalls[index]?.arguments || {}),
      },
    })),
  };

  if (forceToolName === "get_weather" && executedToolCalls.length > 0) {
    const weather = JSON.parse(toolMessages[0].content);

    return {
      text: `The weather in ${weather.location} is currently ${weather.condition} with a temperature of ${weather.temperature}°F.`,
      model: firstResponse.model || model,
      toolCalls: executedToolCalls,
    };
  }

  const finalResponse = await sendOpenRouterRequest({
    model,
    messages: [...messages, assistantToolMessage, ...toolMessages],
    temperature,
    maxTokens,
    toolChoice: "none",
  });
  const finalMessage = finalResponse?.choices?.[0]?.message || {};

  return {
    text: finalMessage.content || "",
    model: finalResponse.model || firstResponse.model || model,
    toolCalls: executedToolCalls,
  };
}

export async function GET() {
  return NextResponse.json({
    configured: Boolean(process.env.OPENROUTER_API_KEY),
    model: DEFAULT_MODEL,
    modes: Object.keys(assistantModes),
    suggestedModels,
  });
}

export async function POST(req) {
  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json(
      { message: "OPENROUTER_API_KEY is not configured." },
      { status: 500 }
    );
  }

  let body;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Invalid request body.",
        issues: parsed.error.issues,
      },
      { status: 400 }
    );
  }

  const model = resolveModel(parsed.data.model);

  if (!modelIdIsValid(model)) {
    return NextResponse.json(
      {
        message:
          "Invalid model ID. Use OpenRouter provider/model format, for example openai/gpt-4o.",
      },
      { status: 400 }
    );
  }

  try {
    const result = await completeWithTools({
      model,
      messages: buildMessages(parsed.data),
      temperature: parsed.data.temperature ?? 0.4,
      maxTokens: parsed.data.maxOutputTokens ?? 1200,
      forceToolName: parsed.data.mode === "weather" ? "get_weather" : "",
    });

    return NextResponse.json(result);
  } catch (error) {
    logOpenRouterError(error);

    return NextResponse.json(
      { message: getOpenRouterError(error) },
      { status: error?.status || 500 }
    );
  }
}
