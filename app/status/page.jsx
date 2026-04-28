"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import axios from "axios";
import Cookies from "js-cookie";
import { Plus, RefreshCw } from "lucide-react";
import Sidebar from "../components/Sidebar";
import StatusCard from "../components/Status";
import { socket } from "../socket";

function getCurrentUser() {
  try {
    const cookieUser = Cookies.get("user");
    if (!cookieUser) return null;

    const parsedUser = JSON.parse(cookieUser);
    return Array.isArray(parsedUser) ? parsedUser[0] : parsedUser;
  } catch (error) {
    console.error("Invalid user cookie:", error);
    return null;
  }
}

function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);

  if (!Number.isFinite(seconds) || seconds < 60) return "Just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} mins ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;

  const days = Math.floor(hours / 24);
  return `${days} days ago`;
}

function groupStoriesByUser(stories) {
  const map = new Map();

  stories.forEach((story) => {
    const userId = String(story?.user?._id || story?.user || "");

    if (!map.has(userId)) {
      map.set(userId, {
        user: story.user,
        stories: [],
        latestStory: story,
      });
    }

    const group = map.get(userId);
    group.stories.push(story);

    const currentTime = new Date(story?.createdAt || 0).getTime();
    const latestTime = new Date(group.latestStory?.createdAt || 0).getTime();

    if (currentTime > latestTime) {
      group.latestStory = story;
    }
  });

  return Array.from(map.values()).sort(
    (a, b) =>
      new Date(b.latestStory?.createdAt || 0).getTime() -
      new Date(a.latestStory?.createdAt || 0).getTime()
  );
}

export default function StatusSidebar() {
  const inputRef = useRef(null);

  const [user, setUser] = useState(null);
  const [preview, setPreview] = useState("/avatar.jpg");
  const [isUploading, setIsUploading] = useState(false);
  const [stories, setStories] = useState([]);
  const [selectedStory, setSelectedStory] = useState(null);
  const [loadingStories, setLoadingStories] = useState(true);
  const [loadError, setLoadError] = useState("");

  const groupedStories = groupStoriesByUser(stories);

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    setPreview(currentUser?.avatar || "/avatar.jpg");

    if (currentUser?.username) {
      if (!socket.connected) socket.connect();
      socket.emit("user", currentUser.username);
    }
  }, []);

  const fetchStories = useCallback(async () => {
    try {
      setLoadingStories(true);
      setLoadError("");

      const res = await axios.get("/api/story/all");
      const fetchedStories = Array.isArray(res.data) ? res.data : [];

      setStories(fetchedStories);

      setSelectedStory((current) => {
        if (!fetchedStories.length) return null;

        if (
          current &&
          fetchedStories.some((story) => story._id === current._id)
        ) {
          return fetchedStories.find((story) => story._id === current._id);
        }

        return fetchedStories[0];
      });
    } catch (error) {
      console.error("Fetch stories error:", error);
      setLoadError("Could not load status updates.");
      setStories([]);
      setSelectedStory(null);
    } finally {
      setLoadingStories(false);
    }
  }, []);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  function handleNextStory() {
    if (!stories.length || !selectedStory) return;

    const currentUserId = String(
      selectedStory?.user?._id || selectedStory?.user || ""
    );

    const userStories = stories.filter(
      (story) => String(story?.user?._id || story?.user || "") === currentUserId
    );

    const currentIndex = userStories.findIndex(
      (story) => story._id === selectedStory._id
    );

    const nextStory = userStories[currentIndex + 1];

    if (nextStory) {
      setSelectedStory(nextStory);
      return;
    }

    const currentGroupIndex = groupedStories.findIndex(
      (group) =>
        String(group?.user?._id || group?.user || "") === currentUserId
    );

    const nextGroup = groupedStories[currentGroupIndex + 1] || groupedStories[0];

    setSelectedStory(nextGroup?.latestStory || null);
  }

  function handleOpenFilePicker() {
    inputRef.current?.click();
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file || !user?._id) return;

    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);

    try {
      setIsUploading(true);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("user_id", user._id);

      const uploadRes = await axios.post("/api/storyupload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const mediaUrl = uploadRes.data?.mediaUrl;

      if (!mediaUrl) {
        throw new Error("Upload failed: no media url returned");
      }

      const createRes = await axios.post("/api/story", {
        userId: user._id,
        mediaUrl,
        caption: "",
      });

      const newStory = createRes.data;

      setPreview(mediaUrl);
      setStories((prev) => [newStory, ...prev]);
      setSelectedStory(newStory);
    } catch (error) {
      console.error("Upload error:", error);
      setPreview(user?.avatar || "/avatar.jpg");
    } finally {
      setIsUploading(false);
      e.target.value = "";
      URL.revokeObjectURL(localPreview);
    }
  }

  async function handleReply(story, text) {
    if (!story?._id || !user?._id) {
      throw new Error("You need to be signed in to reply.");
    }

    const res = await axios.post("/api/story/reply", {
      storyId: story._id,
      senderId: user._id,
      message: text,
    });

    const createdMessage = res.data?.message;
    const reply = res.data?.reply;

    if (createdMessage) {
      if (!socket.connected) socket.connect();
      socket.emit("message", createdMessage);
    }

    if (reply) {
      setStories((prev) =>
        prev.map((item) =>
          item._id === story._id
            ? { ...item, replies: [...(item.replies || []), reply] }
            : item
        )
      );

      setSelectedStory((current) =>
        current?._id === story._id
          ? { ...current, replies: [...(current.replies || []), reply] }
          : current
      );
    }

    return res.data;
  }

  return (
    <div className="app-shell grid min-h-screen grid-cols-1 pb-14 text-white md:grid-cols-[minmax(18rem,22rem)_1fr] lg:grid-cols-[4.5rem_minmax(19rem,23rem)_1fr] lg:pb-0">
      <Sidebar />

      <aside className="app-panel flex min-h-[42vh] flex-col border-b md:min-h-screen md:border-b-0">
        <header className="flex min-h-[72px] items-center justify-between border-b border-white/10 bg-white/[0.03] px-5">
          <div>
            <h1 className="text-xl font-bold">Status</h1>
            <p className="text-xs text-slate-400">
              Recent updates and replies
            </p>
          </div>

          <button
            type="button"
            onClick={fetchStories}
            className="rounded-lg p-2 text-slate-300 transition hover:-translate-y-0.5 hover:bg-white/10 hover:text-white"
            title="Refresh status"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </header>

        <div className="thin-scrollbar flex-1 overflow-y-auto">
          <div className="flex gap-4 px-5 pt-4">
            <button className="border-b-2 border-violet-400 pb-2 text-sm font-bold text-white">
              Recent
            </button>
            <button className="border-b-2 border-transparent pb-2 text-sm font-bold text-slate-500">
              Archive
            </button>
          </div>

          <button
            type="button"
            onClick={handleOpenFilePicker}
            className="flex w-full items-center gap-4 border-l-4 border-transparent px-5 py-4 text-left transition hover:border-cyan-300/60 hover:bg-white/[0.06]"
          >
            <div className="relative">
              <input
                ref={inputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleFileChange}
              />

              <img
                className="size-14 rounded-full border-2 border-cyan-300 object-cover p-0.5"
                alt={user?.username || "me"}
                src={preview}
              />

              <div className="absolute bottom-0 right-0 flex size-6 items-center justify-center rounded-full border-2 border-[#0f172a] bg-cyan-300 text-slate-950">
                <Plus className="h-3.5 w-3.5" />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-bold">My Status</p>
              <p className="truncate text-xs font-bold uppercase text-slate-400">
                {isUploading ? "Uploading..." : "Tap to add update"}
              </p>
            </div>
          </button>

          <div className="px-5 py-3">
            <h2 className="text-[11px] font-bold uppercase tracking-[2px] text-cyan-200">
              Recent updates
            </h2>
          </div>

          {loadError && (
            <p className="mx-5 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {loadError}
            </p>
          )}

          {loadingStories ? (
            <div className="space-y-3 px-5">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="flex animate-pulse items-center gap-4"
                >
                  <div className="size-12 rounded-full bg-white/10" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/2 rounded bg-white/10" />
                    <div className="h-3 w-1/3 rounded bg-white/10" />
                  </div>
                </div>
              ))}
            </div>
          ) : groupedStories.length === 0 ? (
            <p className="px-5 text-sm text-slate-400">No stories yet</p>
          ) : (
            groupedStories.map((group) => {
              const story = group.latestStory;
              const groupUserId = String(group?.user?._id || group?.user || "");
              const selectedUserId = String(
                selectedStory?.user?._id || selectedStory?.user || ""
              );

              const isActive = groupUserId === selectedUserId;

              const replyCount = group.stories.reduce(
                (total, item) => total + (item?.replies?.length || 0),
                0
              );

              return (
                <button
                  type="button"
                  key={groupUserId || story._id}
                  onClick={() => setSelectedStory(story)}
                  className={`flex w-full items-center gap-4 border-l-4 px-5 py-4 text-left transition hover:bg-white/[0.06] ${
                    isActive
                      ? "border-cyan-300 bg-cyan-300/10"
                      : "border-transparent"
                  }`}
                >
                  <div className="rounded-full border-2 border-cyan-300 p-0.5">
                    <Image
                      className="size-12 rounded-full object-cover"
                      alt={story?.user?.username || "user"}
                      src={story?.user?.avatar || "/avatar.jpg"}
                      width={48}
                      height={48}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">
                      {String(groupUserId) === String(user?._id || "")
                        ? "My Status"
                        : story?.user?.username || "Unknown User"}
                    </p>

                    <p className="truncate text-xs font-bold uppercase text-slate-400">
                      {group.stories.length} updates ·{" "}
                      {story?.createdAt ? timeAgo(story.createdAt) : "Just now"}
                    </p>
                  </div>

                  {replyCount > 0 && (
                    <span className="rounded-full bg-cyan-300/10 px-2 py-1 text-xs font-bold text-cyan-100">
                      {replyCount}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </aside>

      <main className="min-h-[58vh] bg-transparent md:min-h-screen">
        <StatusCard
          story={selectedStory}
          currentUser={user}
            stories={stories}
          onNext={handleNextStory}
          onReply={handleReply}
        />
      </main>
    </div>
  );
}