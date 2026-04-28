"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { AlertCircle, MessageCircle, Send } from "lucide-react";

const STORY_DURATION = 5000;

function formatStoryTime(date) {
  if (!date) return "";
  return new Date(date).toLocaleString();
}

function isVideoUrl(mediaUrl = "") {
  const value = mediaUrl.toLowerCase();
  return (
    value.endsWith(".mp4") ||
    value.endsWith(".webm") ||
    value.endsWith(".ogg") ||
    value.includes("/video")
  );
}

export default function StatusCard({
  story,
  stories = [],
  currentUser,
  onNext,
  onReply,
}) {
  const [progress, setProgress] = useState(0);
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");

  const userStories = useMemo(() => {
    if (!story) return [];

    const userId = String(story?.user?._id || story?.user || "");

    return stories.filter(
      (item) => String(item?.user?._id || item?.user || "") === userId
    );
  }, [story, stories]);

  const currentStoryIndex = userStories.findIndex(
    (item) => item._id === story?._id
  );

  const isOwnStory = useMemo(
    () =>
      Boolean(
        story?.user?._id &&
          currentUser?._id &&
          String(story.user._id) === String(currentUser._id)
      ),
    [story, currentUser]
  );

  const canReply = Boolean(currentUser?._id && !isOwnStory);

  useEffect(() => {
    if (!story) return;

    setProgress(0);
    setReplyText("");
    setError("");

    const startTimer = setTimeout(() => {
      setProgress(100);
    }, 80);

    const nextTimer = setTimeout(() => {
      onNext?.();
    }, STORY_DURATION);

    return () => {
      clearTimeout(startTimer);
      clearTimeout(nextTimer);
    };
  }, [story?._id, onNext]);

  async function handleSendReply() {
    const text = replyText.trim();
    if (!story || !text || !canReply || isSending) return;

    try {
      setIsSending(true);
      setError("");
      await onReply?.(story, text);
      setReplyText("");
    } catch (replyError) {
      setError(
        replyError?.response?.data?.message ||
          replyError?.message ||
          "Reply could not be sent."
      );
    } finally {
      setIsSending(false);
    }
  }

  if (!story) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center text-slate-400">
        <div>
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-lg bg-white/5 text-cyan-200">
            <MessageCircle className="h-7 w-7" />
          </div>
          <p className="font-semibold text-white">No status selected</p>
          <p className="mt-1 text-sm">Choose an update from the list.</p>
        </div>
      </div>
    );
  }

  const mediaUrl = story?.mediaUrl || "";
  const isVideo = isVideoUrl(mediaUrl);
  const replyCount = story?.replies?.length || 0;

  return (
    <div className="flex min-h-screen items-center justify-center p-4 md:p-6">
      <section className="group/status relative flex h-[calc(100vh-48px)] w-full max-w-[520px] flex-col overflow-hidden rounded-lg bg-black shadow-[0_0_80px_rgba(0,0,0,0.55)] md:h-[90vh]">
        {isVideo ? (
          <video
            src={mediaUrl}
            autoPlay
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <Image
            src={mediaUrl || "/avatar.jpg"}
            alt="status-content"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 520px"
            className="object-cover transition-transform duration-700 group-hover/status:scale-105"
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/10 to-black/90" />

        <div className="relative z-30 flex w-full gap-1.5 px-5 pt-5">
          {(userStories.length ? userStories : [story]).map((item, index) => {
            let width = "0%";

            if (index < currentStoryIndex) width = "100%";
            if (index === currentStoryIndex || currentStoryIndex === -1) {
              width = `${progress}%`;
            }

            return (
              <div
                key={item._id || index}
                className="h-1 flex-1 overflow-hidden rounded-full bg-white/25"
              >
                <div
                  className="h-full bg-white transition-[width] ease-linear"
                  style={{
                    width,
                    transitionDuration:
                      index === currentStoryIndex ? `${STORY_DURATION}ms` : "0ms",
                  }}
                />
              </div>
            );
          })}
        </div>

        <header className="relative z-30 flex items-center justify-between p-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-full border-2 border-cyan-300 p-0.5">
              <Image
                src={story?.user?.avatar || "/avatar.jpg"}
                alt={story?.user?.username || "avatar"}
                width={44}
                height={44}
                className="size-11 rounded-full object-cover"
              />
            </div>

            <div className="min-w-0 text-white">
              <p className="truncate text-base font-extrabold">
                {story?.user?.username || "Unknown User"}
              </p>
              <p className="truncate text-xs font-bold uppercase text-cyan-100/80">
                {formatStoryTime(story?.createdAt)}
              </p>
            </div>
          </div>

          <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white backdrop-blur">
            {replyCount} replies
          </div>
        </header>

        <button
          type="button"
          aria-label="Next status"
          onClick={onNext}
          className="absolute inset-y-24 right-0 z-20 w-1/4"
        />

        <div className="relative z-30 mt-auto p-5 md:p-6">
          {story?.caption && (
            <p className="mb-5 text-center text-lg font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
              {story.caption}
            </p>
          )}

          {error && (
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-100">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!currentUser?._id ? (
            <div className="rounded-lg border border-white/15 bg-white/10 px-5 py-4 text-sm font-semibold text-white/70 backdrop-blur-xl">
              Sign in to reply to this status.
            </div>
          ) : isOwnStory ? (
            <div className="rounded-lg border border-white/15 bg-white/10 px-5 py-4 text-sm font-semibold text-white/70 backdrop-blur-xl">
              You cannot reply to your own status.
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={replyText}
                disabled={isSending}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSendReply();
                  }
                }}
                placeholder={`Reply to ${story?.user?.username || "user"}...`}
                className="min-w-0 flex-1 rounded-lg border border-white/20 bg-white/10 px-5 py-4 text-sm text-white placeholder-white/45 backdrop-blur-xl transition focus:border-cyan-300 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              />

              <button
                type="button"
                onClick={handleSendReply}
                disabled={!replyText.trim() || isSending}
                className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-cyan-300 text-slate-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}