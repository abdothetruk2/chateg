"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { X, Send } from "lucide-react";

const STORY_DURATION = 5000;
const quickReplies = ["❤️", "🔥", "😂", "👏", "😮", "🎉"];

function isVideoStory(story) {
  const mediaType = String(story?.mediaType || "").toLowerCase();
  const mediaUrl = String(story?.mediaUrl || "").toLowerCase();

  return (
    mediaType.startsWith("video/") ||
    /\.(mp4|webm|ogg|mov)$/i.test(mediaUrl)
  );
}

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
  const isVideo = isVideoStory(currentStory);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-3 py-4 backdrop-blur-md">
      <button
        onClick={onClose}
        className="absolute right-5 top-5 z-50 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white shadow-2xl backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15"
        type="button"
        aria-label="Close status viewer"
      >
        <X size={22} />
      </button>

      <div className="app-scale-in relative h-[84vh] w-full max-w-[420px] overflow-hidden rounded-[2rem] bg-black shadow-[0_32px_100px_rgba(0,0,0,0.62)] ring-1 ring-white/10">
        {isVideo ? (
          <video
            src={currentStory.mediaUrl}
            autoPlay
            muted
            playsInline
            controls
            className="h-full w-full object-cover"
          />
        ) : (
          <Image
            src={currentStory.mediaUrl || "/avatar.jpg"}
            alt="status"
            fill
            priority
            className="object-cover"
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/88" />

        <div className="absolute left-0 right-0 top-0 z-20 flex gap-1.5 p-4">
          {stories.map((storyItem, storyIndex) => {
            let width = "0%";

            if (storyIndex < index) width = "100%";
            if (storyIndex === index) width = `${progress}%`;

            return (
              <div
                key={storyItem._id || storyIndex}
                className="h-1 flex-1 overflow-hidden rounded-full bg-white/25"
              >
                <div
                  className="h-full rounded-full bg-white shadow-[0_0_16px_rgba(255,255,255,0.55)] transition-[width] ease-linear"
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

        <div className="absolute left-0 right-0 top-8 z-20 p-4">
          <div className="flex items-center gap-3">
            <div className="relative h-11 w-11 overflow-hidden rounded-2xl border border-white/20 bg-white/10">
              <Image
                src={currentStory.user?.avatar || "/avatar.jpg"}
                alt={currentStory.user?.username || "status owner"}
                fill
                sizes="44px"
                className="object-cover"
              />
            </div>
            <div className="min-w-0">
              <p className="truncate font-black text-white">
                {currentStory.user?.username || "Unknown"}
              </p>
              <p className="text-xs font-bold uppercase text-white/70">
                {index + 1} / {stories.length}
              </p>
            </div>
          </div>
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
          <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center text-sm font-semibold text-white/70 backdrop-blur">
            You cannot reply to your own status
          </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-center gap-2">
                {quickReplies.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setReplyText((prev) => `${prev}${emoji}`)}
                    className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-lg backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/20"
                    title={`Add ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

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
                  className="min-w-0 flex-1 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/50 outline-none backdrop-blur transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-300/15"
                />

                <button
                  type="button"
                  onClick={handleReply}
                  disabled={!replyText.trim() || sending}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-950/30 transition hover:-translate-y-0.5 disabled:opacity-50"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
