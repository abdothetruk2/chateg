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
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/Chatbar";
import axios from "axios";
import CreateGroup from "./components/CreateGroup";
import StatusViewer from "./components/StatusViewer";
import { socket } from "./socket";
import { useRouter } from "next/navigation";
const filters = ["All", "Unread", "Groups", "Channels"];

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

function getChatName(user) {
  return user?.username || user?.name || "";
}

function getChatId(user) {
  return String(user?._id || user?.username || user?.name || "");
}

function groupStatusByUser(statusList) {
  const map = new Map();

  statusList.forEach((item) => {
    const userId = String(item?.user?._id || item?.user || "");
    if (!userId) return;

    if (!map.has(userId)) {
      map.set(userId, {
        user: item.user,
        stories: [],
        latestStory: item,
      });
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

export default function Home() {
const router = useRouter();
  const [selectedUser, setSelectedUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState([]);
  const [activeStatus, setActiveStatus] = useState(null);
  const [read, setread] = useState([]);
  const [open, setopen] = useState(false);
  const [typingUser, setTypingUser] = useState(null);

  const inputref = useRef(null);
  const currentUser = getCurrentUser();
  const groupedStatus = groupStatusByUser(status);

  async function getMessages(user) {
    try {
      const currentUser = getCurrentUser();
      const chatName = getChatName(user);

      if (!currentUser?.username || !chatName) return;

      const payload = {
        sender: currentUser.username,
        recname: chatName,
        receiver: chatName,
        type: user.type === "group" ? "group" : "user",
        chat: user.type === "group" ? user._id : undefined,
      };

      const res = await axios.post("/api/getMessages", payload);

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

  async function markMessagesRead(user) {
    try {
      const currentUser = getCurrentUser();
      const chatName = getChatName(user);

      if (!currentUser?.username || !chatName) return;

      const payload = {
        sender: currentUser.username,
        recname: chatName,
        receiver: chatName,
        type: user.type === "group" ? "group" : "user",
        chat: user.type === "group" ? user._id : undefined,
      };

      await axios.post("/api/messageread", payload);

      setread((prev) =>
        prev.filter((item) => {
          if (user.type === "group") {
            return String(item.chat || item.receiver || "") !== String(user._id);
          }

          return (
            item.sender !== chatName &&
            item.receiver !== chatName &&
            item.recname !== chatName
          );
        })
      );
    } catch (error) {
      console.error("markMessagesRead error:", error);
    }
  }

  function isMessageForCurrentChat(message, chat) {
    const currentUser = getCurrentUser();
    if (!message || !chat || !currentUser?.username) return false;

    const chatName = getChatName(chat);
    const chatId = getChatId(chat);

    if (chat.type === "group") {
      return (
        message?.type === "group" ||
        String(message?.chat || "") === chatId ||
        String(message?.receiver || "") === chatId ||
        String(message?.receiver || "") === chatName ||
        String(message?.recname || "") === chatName
      );
    }

    const sender = message.sender || message.username || message.from;
    const receiver = message.receiver || message.recname || message.to;

    return (
      (sender === currentUser.username && receiver === chatName) ||
      (sender === chatName && receiver === currentUser.username)
    );
  }

  function addMessageOnce(message) {
    if (!message) return;

    setMessages((prev) => {
      const exists = prev.some(
        (item) =>
          (message._id && item._id === message._id) ||
          (message.clientId && item.clientId === message.clientId) ||
          (message.tempId && item.tempId === message.tempId)
      );

      if (exists) return prev;
      return [...prev, message];
    });
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];

    try {
      const currentUser = getCurrentUser();
      if (!file || !currentUser?._id) return;

      const formdata = new FormData();
      formdata.append("file", file);
      formdata.append("user_id", currentUser._id);

      const uploadRes = await axios.post("/api/storyupload", formdata, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const mediaUrl = uploadRes.data?.mediaUrl;

      if (!mediaUrl) {
        throw new Error("Upload failed: no media url returned");
      }

      const createRes = await axios.post("/api/story", {
        userId: currentUser._id,
        mediaUrl,
        caption: "",
      });

      setStatus((prev) => [createRes.data, ...prev]);

      const userId = String(createRes.data?.user?._id || createRes.data?.user || "");
      const userStories = [createRes.data, ...status].filter(
        (item) => String(item?.user?._id || item?.user || "") === userId
      );

      setActiveStatus({
        ...createRes.data,
        stories: userStories.sort(
          (a, b) =>
            new Date(a?.createdAt || 0).getTime() -
            new Date(b?.createdAt || 0).getTime()
        ),
      });
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
        addMessageOnce(createdMessage);
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

        setActiveStatus((prev) => {
          if (!prev) return prev;

          const nextStories = (prev.stories || [prev]).map((item) =>
            item._id === statusItem._id
              ? { ...item, replies: [...(item.replies || []), reply] }
              : item
          );

          const nextCurrent =
            prev._id === statusItem._id
              ? { ...prev, replies: [...(prev.replies || []), reply] }
              : prev;

          return {
            ...nextCurrent,
            stories: nextStories,
          };
        });
      }
    } catch (error) {
      console.error("Status reply failed:", error);
    }
  }

  useEffect(() => {
    async function getUnreadMessages() {
      try {
        const currentUser = getCurrentUser();
        if (!currentUser?.username) return;

        const res = await axios.post("/api/getMessages", {
          sender: currentUser.username,
        });

        setread(Array.isArray(res.data?.unread) ? res.data.unread : []);
      } catch (error) {
        console.error("Unread messages error:", error);
        setread([]);
      }
    }

    async function getStatus() {
      try {
        const res = await axios.get("/api/story/all");
        setStatus(Array.isArray(res.data) ? res.data : []);
      } catch (error) {
        console.error("Status fetch error:", error);
        setStatus([]);
      }
    }

    async function getUsers() {
      try {
        setLoading(true);

        const res = await fetch("/api/users", { cache: "no-store" });

        if (!res.ok) throw new Error("Failed to fetch users");

        const data = await res.json();
        const groupRes = await axios.get("/api/groups");

        const combined = [
          ...(Array.isArray(data) ? data : []),
          ...(Array.isArray(groupRes.data) ? groupRes.data : []),
        ];

        setUsers(combined);
      } catch (err) {
        console.error("Error fetching users:", err);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }

    getUnreadMessages();
    getStatus();
    getUsers();
  }, []);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser?.username) return;

    function handleConnect() {
      socket.emit("user", currentUser.username);
    }

    function handlePresence(data) {
      if (!data?.username) return;

      const presencePatch = {
        status: Boolean(data.status),
        displayname: data.displayname || (data.status ? "online" : "offline"),
      };

      setUsers((prev) =>
        prev.map((user) =>
          user?.username === data.username ? { ...user, ...presencePatch } : user
        )
      );

      setSelectedUser((prev) =>
        prev?.username === data.username ? { ...prev, ...presencePatch } : prev
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
  }, []);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser?.username) return;

    function handleNewMessage(message) {
      if (!message) return;

      if (isMessageForCurrentChat(message, selectedUser)) {
        addMessageOnce(message);
        if (selectedUser) markMessagesRead(selectedUser);
        return;
      }

      setread((prev) => {
        const exists = prev.some(
          (item) =>
            (message._id && item._id === message._id) ||
            (message.clientId && item.clientId === message.clientId) ||
            (message.tempId && item.tempId === message.tempId)
        );

        if (exists) return prev;
        return [...prev, message];
      });
    }

    socket.on("message", handleNewMessage);
    socket.on("receive-message", handleNewMessage);
    socket.on("new-message", handleNewMessage);

    return () => {
      socket.off("message", handleNewMessage);
      socket.off("receive-message", handleNewMessage);
      socket.off("new-message", handleNewMessage);
    };
  }, [selectedUser]);

  useEffect(() => {
    let timer;

    function handleTyping(data) {
      if (!selectedUser) return;

      const chatName = getChatName(selectedUser);
      const sender = data?.sender || data?.username || data?.from;

      if (sender === chatName) {
        setTypingUser(chatName);

        clearTimeout(timer);
        timer = setTimeout(() => setTypingUser(null), 1500);
      }
    }

    function handleStopTyping(data) {
      if (!selectedUser) return;

      const chatName = getChatName(selectedUser);
      const sender = data?.sender || data?.username || data?.from;

      if (sender === chatName) setTypingUser(null);
    }

    socket.on("typing", handleTyping);
    socket.on("stop-typing", handleStopTyping);

    return () => {
      clearTimeout(timer);
      socket.off("typing", handleTyping);
      socket.off("stop-typing", handleStopTyping);
    };
  }, [selectedUser]);

  function getUnreadCount(user) {
    const chatName = getChatName(user);
    if (!chatName || !Array.isArray(read)) return 0;

    if (user?.type === "group") {
      return read.filter(
        (item) =>
          String(item.chat || item.receiver || item.recname || "") ===
          String(user._id || user.name)
      ).length;
    }

    return read.filter(
      (item) =>
        item.sender === chatName ||
        item.receiver === chatName ||
        item.recname === chatName
    ).length;
  }

  const filteredUsers = users.filter((user) => {
    const userName = (user?.username || user?.name || "").toLowerCase();
    const matchesSearch = userName.includes(search.toLowerCase());
if(currentUser.username==userName) {return false }

    if (!matchesSearch=== "Unread") return getUnreadCount(user) > 0;
    if (activeFilter === "Groups") return user?.type === "group";
    if (activeFilter === "Unread") return getUnreadCount(user) > 0;
    if (activeFilter === "Channels") return user?.type === "channel";

    return true;
  });

  return (
    <div className="app-shell grid min-h-screen grid-cols-1 pb-14 md:grid-cols-[minmax(19rem,22rem)_1fr] lg:grid-cols-[4.5rem_minmax(18rem,22rem)_1fr] lg:pb-0">
      <Sidebar />

      <aside className="app-panel flex min-h-[46vh] w-full flex-col border-b text-white md:h-screen md:border-b-0">
        <div className="border-b border-white/10 p-4">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-cyan-200/70">
                Workspace
              </p>
              <h2 className="text-xl font-bold tracking-tight">Messages</h2>
            </div>

            <button className="rounded-lg p-2 text-slate-400 transition hover:-translate-y-0.5 hover:bg-white/10 hover:text-white">
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>

          <div className="focus-within:border-cyan-300/35 focus-within:bg-white/[0.075] flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.055] px-3 py-2 transition">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chats..."
              className="w-full bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none"
            />
          </div>

          <div
            onClick={() => inputref.current?.click()}
            className="no-scrollbar mt-5 flex cursor-pointer gap-3 overflow-x-auto pb-2"
          >
            <div className="group flex min-w-[58px] flex-col items-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-cyan-300/60 bg-cyan-300/10 transition group-hover:-translate-y-0.5 group-hover:bg-cyan-300/15">
                <Plus className="h-5 w-5 text-cyan-200" />

                <input
                  onChange={handleUpload}
                  type="file"
                  ref={inputref}
                  className="hidden"
                  accept="image/*,video/*"
                />
              </div>

              <span className="text-xs text-slate-300">My Status</span>
            </div>

            {groupedStatus.map((statusItem) => (
              <div
                key={statusItem.user?._id || statusItem._id}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveStatus(statusItem);
                }}
                className="flex min-w-[64px] cursor-pointer flex-col items-center gap-2 transition-transform duration-100 hover:scale-110"
              >
                <div
                  className={`rounded-full p-[2px] ${
                    statusItem.viewed
                      ? "bg-slate-600"
                      : "bg-gradient-to-tr from-pink-500 via-violet-500 to-sky-500"
                  }`}
                >
                  <div className="relative h-14 w-14 overflow-hidden rounded-full bg-[#0b1220] p-[2px]">
                    <Image
                      src={statusItem.mediaUrl || "/avatar.jpg"}
                      alt={statusItem.user?.username || "status"}
                      fill
                      className="rounded-full object-cover"
                      sizes="56px"
                    />
                  </div>
                </div>

                <span className="max-w-[64px] truncate text-xs text-slate-300">
                  {String(statusItem.user?._id || "") === String(currentUser?._id || "")
                    ? "My Status"
                    : statusItem.user?.username || "Unknown"}
                </span>

                {statusItem.stories?.length > 1 && (
                  <span className="text-[10px] text-cyan-200">
                    {statusItem.stories.length} updates
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`whitespace-nowrap rounded-lg border px-4 py-1.5 text-sm font-bold transition-all hover:-translate-y-0.5 ${
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

        <div className="p-4">
          <button className="hover-lift flex w-full items-center justify-between rounded-lg border border-cyan-300/15 bg-cyan-300/10 p-4 text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-300/15">
                <Sparkles className="h-5 w-5 text-cyan-200" />
              </div>
              <div className="text-left">
                <h4 className="font-semibold">Ask AI</h4>
                <p className="text-xs text-slate-300">Powered by EgChat</p>
              </div>
            </div>

            <Stars className="h-5 w-5 text-yellow-300" />
          </button>
        </div>

        <div className="thin-scrollbar flex-1 space-y-2 overflow-y-auto px-4 pb-4">
          {loading ? (
            <div className="app-panel-muted rounded-lg p-4 text-sm text-slate-300">
              Loading users...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="app-panel-muted rounded-lg p-4 text-sm text-slate-300">
              No users found.
            </div>
          ) : (
            filteredUsers.map((user) => {
                
              const isSelected = selectedUser?._id === user._id;
              const unreadCount = getUnreadCount(user);
              const isOnline = Boolean(user?.status);

              return (
                <div
                  key={user._id}
                  onClick={() => {
                    setSelectedUser(user);
                    setTypingUser(null);
                    getMessages(user);
                    markMessagesRead(user);
                  }}
                  className={`hover-lift group flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${
                    isSelected
                      ? "border-cyan-300/35 bg-cyan-300/[0.12] shadow-lg shadow-cyan-950/20"
                      : "border-transparent bg-white/[0.02]"
                  }`}
                >
                  <div className="relative">
                    <div className="relative h-14 w-14 overflow-hidden rounded-full">
                      <Image
                        src={user?.avatar || "/avatar.jpg"}
                        alt={user?.username || user?.name || "User"}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    </div>

                    {unreadCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] animate-bounce items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white shadow-lg">
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
                        title={isOnline ? "Online" : "Offline"}
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-start justify-between gap-3">
                      <h4 className="flex items-center gap-1 truncate font-semibold">
                        <span className="truncate">
                          {user?.username || user?.name}
                        </span>

                        {user?.verified && (
                          <BadgeCheck className="h-4 w-4 shrink-0 text-sky-400" />
                        )}
                      </h4>

                      <span className="shrink-0 text-xs text-slate-400">
                        {user?.time || ""}
                      </span>
                    </div>

                    <div className="text-sm text-slate-300">
                      {typingUser === getChatName(user) ? (
                        <p className="truncate font-semibold text-cyan-300">
                          typing...
                        </p>
                      ) : user?.type === "group" ? (
                        <p className="truncate">
                          <span className="font-bold text-cyan-300">
                            Group •
                          </span>{" "}
                          {user?.message || "Group chat"}
                        </p>
                      ) : user?.type === "channel" ? (
                        <p className="truncate">
                          <span className="font-bold text-cyan-300">
                            Channel •
                          </span>{" "}
                          {user?.message || "No messages yet"}
                        </p>
                      ) : (
                        <p className="truncate">
                          {user?.message || (isOnline ? "Online" : "Offline")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div
          onClick={() => setopen(true)}
          className="border-t border-white/10 p-4"
        >
          <div className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-300 px-4 py-3 font-semibold text-slate-950 shadow-lg shadow-cyan-950/20 transition hover:-translate-y-0.5 hover:bg-cyan-200">
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

      <div>
        <div
          className={`min-h-[54vh] transition-all duration-300 md:h-screen ${
            selectedUser ? "opacity-100" : "opacity-70"
          }`}
        >
          {selectedUser ? (
            <ChatWindow
              selectedUser={selectedUser}
              selectedMessages={messages}
              setMessages={setMessages}
              currentUser={currentUser}
              typingUser={typingUser}
            />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-slate-400">
              <div className="app-panel-muted rounded-lg px-6 py-5 text-center">
                Select a user to start chatting
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}