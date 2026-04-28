"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { X, Send } from "lucide-react";

const STORY_DURATION = 5000;

export default function StatusViewer({
  status,
  currentUser,
  onReply,
  onClose,
}) {
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const stories = useMemo(() => {
    return Array.isArray(status?.stories) && status.stories.length > 0
      ? status.stories
      : status
      ? [status]
      : [];
  }, [status]);

  const currentStory = stories[index] || null;

  const isOwnStatus =
    String(currentStory?.user?._id || "") === String(currentUser?._id || "");

  useEffect(() => {
    setIndex(0);
    setReplyText("");
  }, [status]);

  useEffect(() => {
    if (!currentStory) return;

    setProgress(0);

    const startTimer = setTimeout(() => {
      setProgress(100);
    }, 50);

    const nextTimer = setTimeout(() => {
      if (index < stories.length - 1) {
        setIndex((prev) => prev + 1);
      } else {
        onClose?.();
      }
    }, STORY_DURATION);

    return () => {
      clearTimeout(startTimer);
      clearTimeout(nextTimer);
    };
  }, [currentStory?._id, index, stories.length, onClose]);

  async function handleReply() {
    const text = replyText.trim();
    if (!text || !currentStory || sending || isOwnStatus) return;

    try {
      setSending(true);
      await onReply?.(currentStory, text);
      setReplyText("");
    } finally {
      setSending(false);
    }
  }

  function nextStory() {
    if (index < stories.length - 1) {
      setIndex((prev) => prev + 1);
    } else {
      onClose?.();
    }
  }

  function prevStory() {
    if (index > 0) {
      setIndex((prev) => prev - 1);
    }
  }

  if (!status || !currentStory) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-3">
      <button
        onClick={onClose}
        className="absolute right-5 top-5 z-50 text-white"
        type="button"
      >
        <X size={28} />
      </button>

      <div className="relative h-[80vh] w-full max-w-[400px] overflow-hidden rounded-2xl bg-black">
        <Image
          src={currentStory.mediaUrl || "/avatar.jpg"}
          alt="status"
          fill
          priority
          className="object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/85" />

        <div className="absolute left-0 right-0 top-0 z-20 flex gap-1 p-3">
          {stories.map((storyItem, storyIndex) => {
            let width = "0%";

            if (storyIndex < index) width = "100%";
            if (storyIndex === index) width = `${progress}%`;

            return (
              <div
                key={storyItem._id || storyIndex}
                className="h-1 flex-1 overflow-hidden rounded-full bg-white/30"
              >
                <div
                  className="h-full bg-white transition-[width] ease-linear"
                  style={{
                    width,
                    transitionDuration:
                      storyIndex === index ? `${STORY_DURATION}ms` : "0ms",
                  }}
                />
              </div>
            );
          })}
        </div>

        <div className="absolute left-0 right-0 top-7 z-20 p-4">
          <p className="font-semibold text-white">
            {currentStory.user?.username || "Unknown"}
          </p>
          <p className="text-xs text-white/70">
            {index + 1} / {stories.length}
          </p>
        </div>

        <button
          type="button"
          onClick={prevStory}
          className="absolute bottom-24 left-0 top-20 z-10 w-1/3"
          aria-label="Previous story"
        />

        <button
          type="button"
          onClick={nextStory}
          className="absolute bottom-24 right-0 top-20 z-10 w-1/3"
          aria-label="Next story"
        />

        <div className="absolute bottom-0 left-0 right-0 z-30 p-4">
          {isOwnStatus ? (
            <div className="rounded-xl bg-white/10 px-4 py-3 text-center text-sm text-white/70 backdrop-blur">
              You cannot reply to your own status
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleReply();
                  }
                }}
                disabled={sending}
                placeholder={`Reply to ${
                  currentStory.user?.username || "status"
                }...`}
                className="min-w-0 flex-1 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/50 outline-none backdrop-blur focus:border-cyan-300"
              />

              <button
                type="button"
                onClick={handleReply}
                disabled={!replyText.trim() || sending}
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-300 text-slate-950 disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}