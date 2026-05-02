"use client";

import Image from "next/image";
import Cookies from "js-cookie";
import { useEffect, useRef, useState } from "react";
import {
  MoreVertical,
  Search,
  Plus,
  Sparkles,
  Stars,
  BadgeCheck,
  Megaphone,
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/Chatbar";
import UserListLoader from "../components/UserListLoader";
import axios from "axios";
import CreateGroup from "../components/CreateGroup";
import StatusViewer from "../components/StatusViewer";
import { socket } from "../socket";

const filters = ["All", "Unread", "Groups", "Channels"];

function getCurrentUser() {
  try {
    const cookieUser = Cookies.get("user");
    if (!cookieUser) return null;
    const parsed = JSON.parse(cookieUser);
    return Array.isArray(parsed) ? parsed[0] : parsed;
  } catch {
    return null;
  }
}

function groupStatusByUser(list = []) {
  const map = new Map();

  list.forEach((item) => {
    const userId = String(item?.user?._id || item?.user || "");
    if (!userId) return;

    if (!map.has(userId)) {
      map.set(userId, { latestStory: item, stories: [] });
    }

    const group = map.get(userId);
    group.stories.push(item);

    if (
      new Date(item?.createdAt || 0).getTime() >
      new Date(group.latestStory?.createdAt || 0).getTime()
    ) {
      group.latestStory = item;
    }
  });

  return Array.from(map.values()).map((group) => ({
    ...group.latestStory,
    stories: group.stories.sort(
      (a, b) =>
        new Date(a?.createdAt || 0).getTime() -
        new Date(b?.createdAt || 0).getTime()
    ),
  }));
}

function isVideoStatus(statusItem) {
  const mediaType = String(statusItem?.mediaType || "").toLowerCase();
  const mediaUrl = String(statusItem?.mediaUrl || "").toLowerCase();

  return (
    mediaType.startsWith("video/") ||
    /\.(mp4|webm|ogg|mov)$/i.test(mediaUrl)
  );
}

export default function FriendsPage() {
  const [selectedUser, setSelectedUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState([]);
  const [activeStatus, setActiveStatus] = useState(null);
  const [read, setread] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [sentFriendRequests, setSentFriendRequests] = useState([]);
  const [open, setopen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const inputref = useRef(null);
  const groupedStatus = groupStatusByUser(status);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  useEffect(() => {
    if (!currentUser?.username) return;

    function handleConnect() {
      socket.emit("user", currentUser.username);
    }

    function handlePresence(data) {
      if (!data?.username) return;

      setUsers((prev) =>
        prev.map((user) =>
          user.username === data.username
            ? {
                ...user,
                status: Boolean(data.status),
                displayname: data.status ? "online" : "offline",
              }
            : user
        )
      );
    }

    socket.on("connect", handleConnect);
    socket.on("presence", handlePresence);

    if (socket.connected) handleConnect();
    else socket.connect();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("presence", handlePresence);
    };
  }, [currentUser?.username]);

  useEffect(() => {
    async function loadPage() {
      try {
        if (!currentUser?._id) return;

        setLoading(true);

        const friendsRes = await axios.post("/api/friends", {
          _id: currentUser._id,
        });

        const storyRes = await axios.get("/api/story/all");

        const unreadRes = await axios.post("/api/getMessages", {
          sender: currentUser.username,
        });

        const friends = Array.isArray(friendsRes.data?.friends)
          ? friendsRes.data.friends
          : [];

        setUsers(friends);
        setFriendRequests(
          Array.isArray(friendsRes.data?.friendRequests)
            ? friendsRes.data.friendRequests
            : []
        );
        setSentFriendRequests(
          Array.isArray(friendsRes.data?.sentFriendRequests)
            ? friendsRes.data.sentFriendRequests
            : []
        );
        setStatus(Array.isArray(storyRes.data) ? storyRes.data : []);
        setread(Array.isArray(unreadRes.data?.unread) ? unreadRes.data.unread : []);
      } catch (error) {
        console.error("Friends page load error:", error);
      setUsers([]);
      setFriendRequests([]);
      setSentFriendRequests([]);
      } finally {
        setLoading(false);
      }
    }

    loadPage();
  }, [currentUser?._id, currentUser?.username]);

  async function getMessages(user) {
    try {
      if (!currentUser?.username) return;

      const chatName = user.username || user.name;

      const res = await axios.post("/api/getMessages", {
        sender: currentUser.username,
        receiver: chatName,
        recname: chatName,
        type: user.type === "group" ? "group" : "user",
      });

      const nextMessages = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.messages)
        ? res.data.messages
        : [];

      setMessages(nextMessages);
    } catch (error) {
      console.error("getMessages error:", error);
      setMessages([]);
    }
  }

  async function markRead(user) {
    try {
      if (!currentUser?.username) return;

      const chatName = user.username || user.name;

      await axios.post("/api/messageread", {
        sender: currentUser.username,
        receiver: chatName,
        recname: chatName,
        type: user.type === "group" ? "group" : "user",
      });

      setread((prev) =>
        prev.filter(
          (item) =>
            item.sender !== chatName &&
            item.receiver !== chatName &&
            item.recname !== chatName
        )
      );
    } catch (error) {
      console.error("markRead error:", error);
    }
  }

  async function respondFriendRequest(user, action) {
    try {
      if (!currentUser?._id || !user?._id) return;

      const res = await axios.post("/api/addfriend", {
        userId: currentUser._id,
        friendId: user._id,
        action,
      });

      setFriendRequests((prev) =>
        prev.filter((item) => item._id !== user._id)
      );

      if (res.data?.status === "friends") {
        setUsers((prev) => {
          const exists = prev.some((item) => item._id === user._id);
          return exists ? prev : [user, ...prev];
        });
      }
    } catch (error) {
      console.error("Friend request response failed:", error);
    }
  }

  async function handleUpload(e) {
    try {
      const file = e.target.files?.[0];
      if (!file || !currentUser?._id) return;

      const formdata = new FormData();
      formdata.append("file", file);
      formdata.append("user_id", currentUser._id);

      const uploadRes = await axios.post("/api/storyupload", formdata, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const mediaUrl = uploadRes.data?.mediaUrl;
      const mediaType = uploadRes.data?.mediaType || file.type || "";
      if (!mediaUrl) throw new Error("No mediaUrl returned");

      const createRes = await axios.post("/api/story", {
        userId: currentUser._id,
        mediaUrl,
        mediaType,
        caption: "",
      });

      setStatus((prev) => [createRes.data, ...prev]);
    } catch (error) {
      console.error("Status upload error:", error);
    } finally {
      e.target.value = "";
    }
  }

  async function handleStatusReply(statusItem, replyText) {
    try {
      if (!currentUser?._id || !statusItem?._id || !replyText.trim()) return;

      const res = await axios.post("/api/story/reply", {
        storyId: statusItem._id,
        senderId: currentUser._id,
        message: replyText.trim(),
      });

      const createdMessage = res.data?.message;
      const reply = res.data?.reply;

      if (createdMessage) {
        setMessages((prev) => [...prev, createdMessage]);
        socket.emit("message", createdMessage);
      }

      if (reply) {
        setStatus((prev) =>
          prev.map((item) =>
            item._id === statusItem._id
              ? { ...item, replies: [...(item.replies || []), reply] }
              : item
          )
        );
      }
    } catch (error) {
      console.error("Status reply failed:", error);
    }
  }

  const filteredUsers = users.filter((user) => {
    const name = (user?.username || user?.name || "").toLowerCase();
    const matchesSearch = name.includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (activeFilter === "Unread") {
      return read.some(
        (item) =>
          item.sender === user.username ||
          item.receiver === user.username ||
          item.recname === user.username
      );
    }
    if (activeFilter === "Groups") return user?.type === "group";
    if (activeFilter === "Channels") return user?.type === "channel";

    return true;
  });
  const requestCount = friendRequests.length;
  const pendingCount = sentFriendRequests.length;
  const activeStories = groupedStatus.length;

  return (
    <div className="app-shell grid min-h-screen grid-cols-1 pb-14 md:grid-cols-[minmax(20rem,23rem)_1fr] lg:grid-cols-[4.5rem_minmax(20rem,24rem)_1fr] lg:pb-0">
      <Sidebar />

      <aside
        className={`app-panel min-h-[calc(100vh-4rem)] w-full flex-col border-b text-white md:flex md:h-screen md:border-b-0 ${
          selectedUser ? "hidden" : "flex"
        }`}
      >
        <div className="border-b border-white/10 p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200/80">
                Network
              </p>
              <h2 className="text-2xl font-black tracking-tight">Friends</h2>
              <p className="mt-1 text-sm text-slate-400">
                Requests, active contacts, and shared status updates.
              </p>
            </div>
            <button className="rounded-2xl border border-white/10 bg-white/[0.04] p-2.5 text-slate-400 transition hover:-translate-y-0.5 hover:bg-white/10 hover:text-white">
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>

          <div className="app-input flex items-center gap-2 rounded-2xl px-3 py-3">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search friends..."
              className="w-full bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none"
            />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              ["Friends", filteredUsers.length],
              ["Requests", requestCount],
              ["Status", activeStories || pendingCount],
            ].map(([label, value]) => (
              <div key={label} className="app-stat-card rounded-2xl px-3 py-3">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                  {label}
                </p>
                <p className="mt-1 text-lg font-black text-white">{value}</p>
              </div>
            ))}
          </div>

          <div
            onClick={() => inputref.current?.click()}
            className="no-scrollbar mt-5 flex cursor-pointer gap-3 overflow-x-auto pb-2"
          >
            <div className="group flex min-w-[58px] flex-col items-center gap-2">
              <div className="flex h-14 w-14 items-center justify-center rounded-[1.35rem] border border-dashed border-cyan-300/60 bg-cyan-300/10 transition group-hover:-translate-y-0.5">
                <Plus className="h-5 w-5 text-cyan-200" />
                <input
                  onChange={handleUpload}
                  type="file"
                  ref={inputref}
                  accept="image/*,video/*"
                  className="hidden"
                />
              </div>
              <span className="text-xs font-semibold text-slate-300">My Status</span>
            </div>

            {groupedStatus.map((statusItem) => (
              <div
                key={statusItem.user?._id || statusItem._id}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveStatus(statusItem);
                }}
                className="flex min-w-[70px] cursor-pointer flex-col items-center gap-2 transition-transform duration-100 hover:scale-105"
              >
                <div className="rounded-full bg-gradient-to-tr from-pink-500 via-violet-500 to-sky-500 p-[2px]">
                  <div className="relative h-14 w-14 overflow-hidden rounded-full bg-[#0b1220] p-[2px]">
                    {isVideoStatus(statusItem) ? (
                      <video
                        src={statusItem.mediaUrl}
                        className="h-full w-full rounded-full object-cover"
                        muted
                        playsInline
                      />
                    ) : (
                      <Image
                        src={statusItem.mediaUrl || "/avatar.jpg"}
                        alt={statusItem.user?.username || "status"}
                        fill
                        className="rounded-full object-cover"
                        sizes="56px"
                      />
                    )}
                  </div>
                </div>

                <span className="max-w-[70px] truncate text-xs font-semibold text-slate-300">
                  {String(statusItem.user?._id || "") === String(currentUser?._id || "")
                    ? "My Status"
                    : statusItem.user?.username || "Unknown"}
                </span>
              </div>
            ))}
          </div>

          <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-bold transition-all hover:-translate-y-0.5 ${
                  activeFilter === filter
                    ? "border-cyan-300/30 bg-cyan-300/15 text-cyan-100"
                    : "border-white/10 bg-white/[0.045] text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5">
          <button className="app-surface hover-lift flex w-full items-center justify-between rounded-[1.5rem] p-4 text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-300/15">
                <Sparkles className="h-5 w-5 text-cyan-200" />
              </div>
              <div>
                <h4 className="font-black">Ask AI</h4>
                <p className="text-xs leading-5 text-slate-300">
                  Summarize chats, suggest replies, translate messages, or explain code.
                </p>
              </div>
            </div>
            <Stars className="h-5 w-5 text-yellow-300" />
          </button>
        </div>

        <div className="thin-scrollbar flex-1 space-y-3 overflow-y-auto px-5 pb-5">
          {friendRequests.length > 0 && (
            <section className="app-surface rounded-[1.5rem] p-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-cyan-100">
                  Friend Requests
                </h3>
                <span className="rounded-full bg-black/20 px-2 py-0.5 text-xs text-cyan-100">
                  {friendRequests.length}
                </span>
              </div>

              {friendRequests.map((requestUser) => (
                <div
                  key={requestUser._id}
                  className="app-list-item flex items-center justify-between gap-3 rounded-2xl p-2.5"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full">
                      <Image
                        src={requestUser?.avatar || "/avatar.jpg"}
                        alt={requestUser?.username || "Friend request"}
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {requestUser?.username}
                      </p>
                      <p className="truncate text-xs text-slate-400">
                        {requestUser?.about || "Wants to be friends"}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => respondFriendRequest(requestUser, "accept")}
                      className="rounded-xl bg-cyan-300 px-3 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-cyan-200"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => respondFriendRequest(requestUser, "decline")}
                      className="rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:bg-white/15"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </section>
          )}

          {sentFriendRequests.length > 0 && (
            <section className="app-surface-muted rounded-[1.5rem] p-3">
              <p className="text-xs font-bold uppercase tracking-[1.5px] text-slate-400">
                Sent requests
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {sentFriendRequests.slice(0, 6).map((requestUser) => (
                  <span
                    key={requestUser._id}
                    className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300"
                  >
                    {requestUser?.username}
                  </span>
                ))}
              </div>
            </section>
          )}

          {loading ? (
            <UserListLoader count={5} label="Loading friends" />
          ) : filteredUsers.length === 0 ? (
            <div className="app-empty-state rounded-[1.5rem] p-5 text-sm text-slate-300">
              No friends found.
            </div>
          ) : (
            filteredUsers.map((user) => {
              const isSelected = selectedUser?._id === user._id;
              const isOnline = Boolean(user?.status);
              const unreadCount = read.filter(
                (item) =>
                  item.sender === user.username ||
                  item.receiver === user.username ||
                  item.recname === user.username
              ).length;

              return (
                <div
                  key={user._id}
                  onClick={() => {
                    setSelectedUser(user);
                    getMessages(user);
                    markRead(user);
                  }}
                  className={`app-list-item group flex cursor-pointer items-center gap-3 rounded-[1.5rem] p-3.5 ${
                    isSelected
                      ? "border-cyan-300/35 bg-cyan-300/[0.12]"
                      : ""
                  }`}
                >
                  <div className="relative">
                    <div className="relative h-14 w-14 overflow-hidden rounded-[1.35rem] ring-1 ring-white/10">
                      <Image
                        src={user?.avatar || "/avatar.jpg"}
                        alt={user?.username || "User"}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    </div>

                    {unreadCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
                        {unreadCount}
                      </span>
                    )}

                    {user?.type === "channel" ? (
                      <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-white ring-2 ring-[#0b1220]">
                        <Megaphone className="h-3.5 w-3.5" />
                      </div>
                    ) : user?.type === "group" ? (
                      <span className="absolute -bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-[#0b1220] bg-violet-500" />
                    ) : (
                      <span
                        className={`absolute -bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-[#0b1220] ${
                          isOnline ? "bg-emerald-500" : "bg-slate-500"
                        }`}
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="flex items-center gap-1 truncate font-black">
                      <span className="truncate">{user?.username || user?.name}</span>
                      {user?.verified && (
                        <BadgeCheck className="h-4 w-4 shrink-0 text-sky-400" />
                      )}
                    </h4>

                    <p className="truncate text-sm text-slate-300">
                      {user?.message || (isOnline ? "Online" : "Offline")}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div onClick={() => setopen(true)} className="border-t border-white/10 p-5">
          <div className="app-button-primary flex w-full py-3.5 font-semibold">
            <Plus className="h-5 w-5" />
            <span>Add Group</span>
          </div>
        </div>

        <CreateGroup open={open} close={() => setopen(false)} />
      </aside>

      {activeStatus && (
        <StatusViewer
          status={activeStatus}
          currentUser={currentUser}
          onReply={handleStatusReply}
          onClose={() => setActiveStatus(null)}
        />
      )}

      <div className={selectedUser ? "block" : "hidden md:block"}>
        <div
          className={`min-h-[calc(100vh-3.5rem)] transition-all duration-300 md:h-screen ${
            selectedUser ? "opacity-100" : "opacity-70"
          }`}
        > 
          {selectedUser ? (
            <ChatWindow
              selectedUser={selectedUser}
              selectedMessages={messages}
              setMessages={setMessages}
              currentUser={currentUser}
              onBack={() => setSelectedUser(null)}
            />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-slate-400">
              <div className="app-empty-state rounded-[1.75rem] px-6 py-5 text-center">
                Select a friend to start chatting
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
