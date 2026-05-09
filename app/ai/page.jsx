"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Check,
  Copy,
  ImageIcon,
  Languages,
  Loader2,
  Reply,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import { cn } from "../../lib/utils";

const STORAGE_KEY = "nexchat-ai-thread-v2";

const modes = [
  {
    id: "chat",
    label: "Chat",
    icon: Bot,
    placeholder: "Ask Egchat AI anything...",
    samples: [
      "Give me a friendly reply to this message.",
      "Help me write a clear message to my friend.",
    ],
  },
  {
    id: "reply",
    label: "Smart Reply",
    icon: Reply,
    placeholder: "Paste a message and AI will help you reply...",
    samples: [
      "Write a short friendly reply to: ",
      "Make this message sound more polite: ",
    ],
  },
  {
    id: "translate",
    label: "Translate",
    icon: Languages,
    placeholder: "Write text to translate...",
    samples: [
      "Translate this to Arabic: ",
      "Translate this to English: ",
    ],
  },
  {
    id: "image",
    label: "Generate Image",
    icon: ImageIcon,
    placeholder: "Describe the image you want...",
    samples: [
      "A realistic HD photo of Mount Everest at sunrise, cinematic lighting",
      "A futuristic chat app dashboard, dark mode, neon blue glow",
    ],
  },
];

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatTime(value) {
  if (!value) return "";

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getApiMessages(messages) {
  return messages
    .filter((message) => message.content?.trim())
    .slice(-10)
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));
}

function TypingText({ text, speed = 12, onDone }) {
  const [visibleText, setVisibleText] = useState("");

  useEffect(() => {
    if (!text) return;

    let index = 0;

    const timer = window.setInterval(() => {
      index += 1;
      setVisibleText(text.slice(0, index));

      if (index >= text.length) {
        window.clearInterval(timer);
        onDone?.();
      }
    }, speed);

    return () => window.clearInterval(timer);
  }, [text, speed, onDone]);

  return (
    <span>
      {visibleText}
      {visibleText.length < text.length && (
        <span className="ml-0.5 inline-block h-4 w-1 animate-pulse rounded-full bg-cyan-200 align-middle" />
      )}
    </span>
  );
}

export default function AiPage() {
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const [hydrated, setHydrated] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState("chat");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState("");

  const activeMode = useMemo(
    () => modes.find((item) => item.id === mode) || modes[0],
    [mode]
  );

  const ModeIcon = activeMode.icon;
  const canRetry = hydrated && messages.some((item) => item.role === "user");
  const canClear = hydrated && messages.length > 0;

  useEffect(() => {
    try {
      const savedMessages = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "[]"
      );

      if (Array.isArray(savedMessages)) {
        setMessages(savedMessages);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [hydrated, messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function sendMessage(content = draft, baseMessages = messages) {
    const text = content.trim();

    if (!text || sending) return;

    const userMessage = {
      id: createId(),
      role: "user",
      content: text,
      mode,
      createdAt: new Date().toISOString(),
    };

    const nextMessages = [...baseMessages, userMessage];

    setMessages(nextMessages);
    setDraft("");
    setSending(true);
    setError("");

    try {
      const endpoint = mode === "image" ? "/api/gemini-image" : "/api/gemini";

      const body =
        mode === "image"
          ? { prompt: text }
          : {
              mode,
              messages: getApiMessages(nextMessages),
            };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || "AI request failed.");
      }

      const assistantMessage = {
        id: createId(),
        role: "assistant",
        content:
          mode === "image"
            ? data?.text || "Here is your generated image."
            : data?.text || "No response returned.",
        imageUrl: data?.imageUrl || "",
        isTyping: mode !== "image",
        createdAt: new Date().toISOString(),
      };

      setMessages((current) => [...current, assistantMessage]);
    } catch (sendError) {
      setError(sendError.message || "AI request failed.");
    } finally {
      setSending(false);
    }
  }

  function finishTyping(messageId) {
    setMessages((current) =>
      current.map((item) =>
        item.id === messageId ? { ...item, isTyping: false } : item
      )
    );
  }

  function retryLastMessage() {
    const lastUserIndex = messages.findLastIndex(
      (message) => message.role === "user"
    );

    if (lastUserIndex < 0 || sending) return;

    const lastUserMessage = messages[lastUserIndex];
    setMode(lastUserMessage.mode || "chat");
    sendMessage(lastUserMessage.content, messages.slice(0, lastUserIndex));
  }

  function clearThread() {
    if (sending) return;
    setMessages([]);
    setError("");
    localStorage.removeItem(STORAGE_KEY);
  }

  async function copyMessage(message) {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedId(message.id);
      window.setTimeout(() => setCopiedId(""), 1400);
    } catch {
      setError("Could not copy message.");
    }
  }

  function insertSample(sample) {
    setDraft(sample);
    textareaRef.current?.focus();
  }

  function submitForm(event) {
    event.preventDefault();
    sendMessage();
  }

  function handleComposerKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="app-shell grid min-h-screen grid-cols-1 pb-14 text-white lg:grid-cols-[4.5rem_1fr] lg:pb-0">
      <Sidebar />

      <main className="app-chat-canvas relative flex min-h-screen flex-col overflow-hidden">
        <header className="app-surface relative z-10 mx-3 mt-3 rounded-[1.5rem] px-4 py-4 lg:mx-5 lg:px-6">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-300/20">
                <Sparkles className="h-6 w-6" />
              </div>

              <div>
                <h1 className="app-gradient-text text-xl font-black tracking-tight">
                  Egchat AI
                </h1>
                <p className="text-sm text-slate-400">
                  Smart replies, translation, image generation, and AI help
                </p>
              </div>
            </div>

            <div className="hidden rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-200 sm:block">
              Powered by Gemini
            </div>
          </div>
        </header>

        <section className="relative z-10 px-4 py-4 lg:px-8">
          <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto pb-1">
            {modes.map((item) => {
              const Icon = item.icon;
              const active = item.id === mode;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMode(item.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition",
                    active
                      ? "border-cyan-300/40 bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-500/20"
                      : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="relative z-10 flex-1 overflow-y-auto px-4 py-6 lg:px-8">
          {messages.length === 0 ? (
            <div className="mx-auto grid min-h-[60vh] max-w-4xl place-items-center">
              <div className="app-premium-card w-full rounded-[2rem] p-6 text-center sm:p-8">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-300/20">
                  <ModeIcon className="h-8 w-8" />
                </div>

                <h2 className="mt-5 text-3xl font-black tracking-tight">
                  What do you want to create?
                </h2>

                <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400">
                  Ask a question, write a reply, translate text, or generate an
                  image directly inside Egchat.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {activeMode.samples.map((sample) => (
                    <button
                      key={sample}
                      type="button"
                      onClick={() => insertSample(sample)}
                      className="group app-section-card rounded-2xl px-4 py-4 text-left text-sm leading-6 text-slate-300 transition hover:border-cyan-300/30 hover:bg-cyan-300/10 hover:text-white"
                    >
                      <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-200/70">
                        <Wand2 className="h-3.5 w-3.5" />
                        Try this
                      </div>
                      {sample}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
              {messages.map((message) => {
                const isUser = message.role === "user";

                return (
                  <article
                    key={message.id}
                    className={cn(
                      "app-message-row flex gap-3",
                      isUser ? "justify-end" : "justify-start"
                    )}
                  >
                    {!isUser && (
                      <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-300/20">
                        <Bot className="h-5 w-5" />
                      </div>
                    )}

                    <div
                      className={cn(
                        "max-w-[min(44rem,88vw)] rounded-[1.4rem] px-4 py-3 shadow-lg",
                        isUser
                          ? "app-message-bubble-out rounded-br-md text-slate-950 shadow-cyan-500/10"
                          : "app-message-bubble-in rounded-bl-md text-slate-100 shadow-black/20 backdrop-blur"
                      )}
                    >
                      {message.imageUrl && (
                        <div className="mb-3 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={message.imageUrl}
                            alt="Generated by Egchat AI"
                            className="block max-h-[480px] w-full object-contain"
                          />
                        </div>
                      )}

                      <div className="whitespace-pre-wrap break-words text-sm leading-7">
                        {!isUser && message.isTyping ? (
                          <TypingText
                            text={message.content}
                            onDone={() => finishTyping(message.id)}
                          />
                        ) : (
                          message.content
                        )}
                      </div>

                      <div
                        className={cn(
                          "mt-3 flex items-center justify-between gap-3 text-xs",
                          isUser ? "text-slate-700" : "text-slate-400"
                        )}
                      >
                        <span>{formatTime(message.createdAt)}</span>

                        {!isUser && (
                          <button
                            type="button"
                            onClick={() => copyMessage(message)}
                            className="inline-flex items-center gap-1 font-bold transition hover:text-cyan-200"
                          >
                            {copiedId === message.id ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                            {copiedId === message.id ? "Copied" : "Copy"}
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}

              {sending && (
                <div className="app-section-card flex w-fit items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-300">
                  <Loader2 className="h-4 w-4 animate-spin text-cyan-200" />
                  {mode === "image"
                    ? "Generating your image..."
                    : "Egchat AI is typing..."}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </section>

        {error && (
          <div className="relative z-10 mx-4 mb-3 flex items-center gap-2 rounded-2xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100 lg:mx-8">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <footer className="app-composer relative z-10 m-3 rounded-[1.5rem] px-4 py-4 lg:m-5 lg:px-5">
          <form
            onSubmit={submitForm}
            className="mx-auto max-w-4xl rounded-[1.6rem] border border-white/10 bg-white/[0.05] p-3"
          >
            <div className="mb-3 flex items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-300">
                <ModeIcon className="h-4 w-4 text-cyan-200" />
                {activeMode.label}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={retryLastMessage}
                  disabled={sending || !canRetry}
                  className="app-icon-button rounded-xl p-2 disabled:opacity-40"
                  title="Retry"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={clearThread}
                  disabled={sending || !canClear}
                  className="app-icon-button rounded-xl p-2 disabled:opacity-40"
                  title="Clear"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex items-end gap-3">
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                rows={2}
                placeholder={activeMode.placeholder}
                className="max-h-40 min-h-16 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-7 text-white outline-none placeholder:text-slate-500"
              />

              <button
                type="submit"
                disabled={!draft.trim() || sending}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:scale-105 disabled:cursor-not-allowed disabled:scale-100 disabled:opacity-45"
                title="Send"
              >
                {sending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </div>
          </form>
        </footer>
      </main>
    </div>
  );
}
