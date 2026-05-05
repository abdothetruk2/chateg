"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import Link from "next/link";
import Cookies from "js-cookie";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  MoreVertical,
  Search,
  Plus,
  Sparkles,
  Stars,
  BadgeCheck,
  Megaphone,
  GripVertical,
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import UserListLoader from "../components/UserListLoader";
import axios from "axios";
import { useRouter } from "next/navigation";
import { playNotificationSound } from "../../lib/clientPreferences";
import { setGroups } from "../../features/groups/groupSlice";
import { addStatus, setStatuses } from "../../features/status/statusSlice";
const filters = ["All", "Unread", "Groups", "Channels"];

let socketPromise;

function loadSocket() {
  if (!socketPromise) {
    socketPromise = import("../socket").then((module) => module.socket);
  }

  return socketPromise;
}

const ChatWindow = dynamic(() => import("../components/Chatbar"), {
  loading: () => (
    <div className="flex h-full flex-col gap-4 px-4 py-5 md:px-6">
      <div className="skeleton-shimmer h-16 rounded-[1.5rem] bg-white/10" />
      <div className="flex-1 space-y-4 py-6">
        <div className="skeleton-shimmer h-12 w-2/5 rounded-2xl bg-white/10" />
        <div className="skeleton-shimmer ml-auto h-12 w-1/2 rounded-2xl bg-cyan-300/20" />
        <div className="skeleton-shimmer h-24 w-3/5 rounded-2xl bg-white/10" />
      </div>
      <div className="skeleton-shimmer h-16 rounded-[1.5rem] bg-white/10" />
    </div>
  ),
});

const CreateGroup = dynamic(() => import("../components/CreateGroup"), {
  ssr: false,
});

const StatusViewer = dynamic(() => import("../components/StatusViewer"), {
  ssr: false,
});

function runWhenIdle(callback) {
  if (typeof window === "undefined") return undefined;

  if ("requestIdleCallback" in window) {
    const id = window.requestIdleCallback(callback, { timeout: 2000 });
    return () => window.cancelIdleCallback(id);
  }

  const id = window.setTimeout(callback, 1);
  return () => window.clearTimeout(id);
}

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

function isVideoStatus(statusItem) {
  const mediaType = String(statusItem?.mediaType || "").toLowerCase();
  const mediaUrl = String(statusItem?.mediaUrl || "").toLowerCase();

  return (
    mediaType.startsWith("video/") ||
    /\.(mp4|webm|ogg|mov)$/i.test(mediaUrl)
  );
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
  const dispatch = useDispatch();
  const groups = useSelector((state) => state.groups.groups);
  const statuses = useSelector((state) => state.status.statuses);
  const [selectedUser, setSelectedUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [messages, setMessages] = useState([]);
  const [activeStatus, setActiveStatus] = useState(null);
  const [read, setread] = useState([]);
  const [open, setopen] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [draggingUserId, setDraggingUserId] = useState("");
  const [dragOverUserId, setDragOverUserId] = useState("");

  const inputref = useRef(null);
  const socketRef = useRef(null);
  const isAuthenticated = Boolean(currentUser?._id);
  const groupedStatus = groupStatusByUser(statuses);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
    setAuthReady(true);
  }, []);

  useEffect(() => {
    if (authReady && !isAuthenticated) {
      router.replace("/login");
    }
  }, [authReady, isAuthenticated, router]);

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

      if (user.type !== "group") {
        socketRef.current?.emit("messages-read", {
          sender: chatName,
          reader: currentUser.username,
        });
      }

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
      const mediaType = uploadRes.data?.mediaType || file.type || "";

      if (!mediaUrl) {
        throw new Error("Upload failed: no media url returned");
      }

      const createRes = await axios.post("/api/story", {
        userId: currentUser._id,
        mediaUrl,
        mediaType,
        caption: "",
      });
      const newStatus = createRes.data;

      dispatch(addStatus(newStatus));
      const socket = socketRef.current || (await loadSocket());
      socketRef.current = socket;
      if (!socket.connected) socket.connect();
      socket.emit("status:new", newStatus);

      const userId = String(newStatus?.user?._id || newStatus?.user || "");
      const userStories = [newStatus, ...statuses].filter(
        (item) => String(item?.user?._id || item?.user || "") === userId
      );

      setActiveStatus({
        ...newStatus,
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
        socketRef.current?.emit("message", createdMessage);
      }

      if (reply) {
        dispatch(
          setStatuses(
            statuses.map((item) =>
            item._id === statusItem._id
              ? { ...item, replies: [...(item.replies || []), reply] }
              : item
            )
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
        dispatch(setStatuses(Array.isArray(res.data) ? res.data : []));
      } catch (error) {
        console.error("Status fetch error:", error);
        dispatch(setStatuses([]));
      }
    }

    async function getUsers() {
      try {
        setLoading(true);

        const [res, groupRes] = await Promise.all([
          fetch("/api/users", { cache: "no-store" }),
          axios.get("/api/groups"),
        ]);

        if (!res.ok) throw new Error("Failed to fetch users");

        const data = await res.json();

        const fetchedGroups = Array.isArray(groupRes.data) ? groupRes.data : [];
        dispatch(setGroups(fetchedGroups));

        const combined = [...(Array.isArray(data) ? data : []), ...fetchedGroups];

        setUsers(combined);
      } catch (err) {
        console.error("Error fetching users:", err);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }

    getUsers();

    return runWhenIdle(() => {
      getUnreadMessages();
      getStatus();
    });
  }, [dispatch]);

  useEffect(() => {
    setUsers((prev) => {
      const nonGroups = prev.filter((user) => user?.type !== "group");
      return [...nonGroups, ...groups];
    });
  }, [groups]);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser?.username) return;

    let mounted = true;
    let cleanup = () => {};

    const cancelIdle = runWhenIdle(() => {
      loadSocket().then((socket) => {
        if (!mounted) return;

        socketRef.current = socket;

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
              user?.username === data.username
                ? { ...user, ...presencePatch }
                : user
            )
          );

          setSelectedUser((prev) =>
            prev?.username === data.username
              ? { ...prev, ...presencePatch }
              : prev
          );
        }

        socket.on("connect", handleConnect);
        socket.on("presence", handlePresence);

        if (socket.connected) handleConnect();
        else socket.connect();

        cleanup = () => {
          socket.off("connect", handleConnect);
          socket.off("presence", handlePresence);
        };
      });
    });

    return () => {
      mounted = false;
      cancelIdle?.();
      cleanup();
    };
  }, []);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser?.username) return;

    let mounted = true;
    let cleanup = () => {};

    const cancelIdle = runWhenIdle(() => {
      loadSocket().then((socket) => {
        if (!mounted) return;

        socketRef.current = socket;

        function handleNewMessage(message) {
          if (!message) return;

          if (message.sender !== currentUser.username) {
            playNotificationSound("message");
          }

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

        cleanup = () => {
          socket.off("message", handleNewMessage);
          socket.off("receive-message", handleNewMessage);
          socket.off("new-message", handleNewMessage);
        };
      });
    });

    return () => {
      mounted = false;
      cancelIdle?.();
      cleanup();
    };
  }, [selectedUser]);

  useEffect(() => {
    if (!selectedUser) return;

    let timer;
    let mounted = true;
    let cleanup = () => {};

    function handleTyping(data) {
      if (!selectedUser) return;

      const chatName = getChatName(selectedUser);
      const sender = data?.sender || data?.username || data?.from;

      if (sender === chatName) {
        setTypingUser(chatName);

        clearTimeout(timer);
        timer = setTimeout(() => setTypingUser(null), 750);
      }
    }

    function handleStopTyping(data) {
      if (!selectedUser) return;

      const chatName = getChatName(selectedUser);
      const sender = data?.sender || data?.username || data?.from;

      if (sender === chatName) setTypingUser(null);
    }

    const cancelIdle = runWhenIdle(() => {
      loadSocket().then((socket) => {
        if (!mounted) return;

        socketRef.current = socket;
        socket.on("typing", handleTyping);
        socket.on("stop-typing", handleStopTyping);

        cleanup = () => {
          socket.off("typing", handleTyping);
          socket.off("stop-typing", handleStopTyping);
        };
      });
    });

    return () => {
      mounted = false;
      cancelIdle?.();
      clearTimeout(timer);
      cleanup();
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

  function reorderUsers(sourceId, targetId) {
    if (!sourceId || !targetId || sourceId === targetId) return;

    setUsers((prev) => {
      const sourceIndex = prev.findIndex((user) => getChatId(user) === sourceId);
      const targetIndex = prev.findIndex((user) => getChatId(user) === targetId);

      if (sourceIndex === -1 || targetIndex === -1) return prev;

      const next = [...prev];
      const [movedUser] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, movedUser);

      return next;
    });
  }

  function handleUserDragStart(event, user) {
    const userId = getChatId(user);
    if (!userId) return;

    setDraggingUserId(userId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", userId);
  }

  function handleUserDrop(event, targetUser) {
    event.preventDefault();

    const sourceId =
      event.dataTransfer.getData("text/plain") || draggingUserId;
    const targetId = getChatId(targetUser);

    reorderUsers(sourceId, targetId);
    setDraggingUserId("");
    setDragOverUserId("");
  }

  const filteredUsers = users.filter((user) => {
    const userName = (user?.username || user?.name || "").toLowerCase();
    const matchesSearch = userName.includes(search.toLowerCase());
    if (!currentUser?.username || currentUser.username.toLowerCase() === userName) {
      return false;
    }

    if (!matchesSearch) return false;
    if (activeFilter === "Groups") return user?.type === "group";
    if (activeFilter === "Unread") return getUnreadCount(user) > 0;
    if (activeFilter === "Channels") return user?.type === "channel";

    return true;
  });
  const unreadThreads = filteredUsers.filter((user) => getUnreadCount(user) > 0).length;
  const groupCount = users.filter((user) => user?.type === "group").length;
  const storyCount = groupedStatus.length;

  if (!authReady || !isAuthenticated) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center px-6 text-slate-300">
        <div className="app-panel-muted rounded-lg px-6 py-5">
          Opening Egchat...
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell grid min-h-screen grid-cols-1 pb-[calc(4rem_+_env(safe-area-inset-bottom))] md:grid-cols-[minmax(20rem,23rem)_1fr] lg:grid-cols-[4.5rem_minmax(20rem,24rem)_1fr] lg:pb-0">
      <Sidebar />

      <aside
        className={`app-panel min-h-[calc(100svh_-_4rem)] w-full flex-col border-b text-white md:flex md:h-[calc(100svh_-_4rem)] md:border-b-0 md:border-r md:border-white/10 lg:h-screen ${
          selectedUser ? "hidden" : "flex"
        }`}
      >
        <div className="border-b border-white/10 p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between sm:mb-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200/80">
                Workspace
              </p>
              <h2 className="app-gradient-text text-2xl font-black tracking-tight">
                Messages
              </h2>
              <p className="mt-1 hidden text-sm text-slate-400 sm:block">
                Direct chats, groups, and live status activity.
              </p>
            </div>

            <button className="app-icon-button rounded-2xl p-2.5" type="button">
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>

          <div className="app-input flex items-center gap-2 rounded-2xl px-3 py-3">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chats..."
              className="w-full bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none"
            />
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 sm:mt-4">
            {[
              ["Chats", filteredUsers.length],
              ["Unread", unreadThreads],
              ["Groups", groupCount || storyCount],
            ].map(([label, value]) => (
              <div key={label} className="app-stat-card rounded-2xl px-2.5 py-2.5 sm:px-3 sm:py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400 sm:text-[11px] sm:tracking-[0.16em]">
                  {label}
                </p>
                <p className="mt-1 text-lg font-black text-white">{value}</p>
              </div>
            ))}
          </div>

          <div
            onClick={() => inputref.current?.click()}
            className="no-scrollbar mt-4 flex cursor-pointer gap-3 overflow-x-auto pb-2 sm:mt-5"
          >
            <div className="group flex min-w-[54px] flex-col items-center gap-2 sm:min-w-[58px]">
              <div className="flex h-12 w-12 items-center justify-center rounded-[1.15rem] border border-dashed border-cyan-300/60 bg-cyan-300/10 transition group-hover:-translate-y-0.5 group-hover:bg-cyan-300/15 sm:h-14 sm:w-14 sm:rounded-[1.35rem]">
                <Plus className="h-5 w-5 text-cyan-200" />

                <input
                  onChange={handleUpload}
                  type="file"
                  ref={inputref}
                  className="hidden"
                  accept="image/*,video/*"
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
                className="flex min-w-[62px] cursor-pointer flex-col items-center gap-2 transition-transform duration-100 hover:scale-105 sm:min-w-[70px]"
              >
                  <div
                  className={`rounded-full p-[2px] ${
                    statusItem.viewed
                      ? "bg-slate-600"
                      : "app-status-ring"
                  }`}
                >
                  <div className="relative h-12 w-12 overflow-hidden rounded-full bg-[#0b1220] p-[2px] sm:h-14 sm:w-14">
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

                <span className="max-w-[62px] truncate text-xs font-semibold text-slate-300 sm:max-w-[70px]">
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

          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1 sm:mt-4">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`whitespace-nowrap rounded-full border px-3 py-2 text-sm font-bold transition-all hover:-translate-y-0.5 sm:px-4 ${
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

        <div className="hidden p-5 sm:block">
          <Link href="/ai" className="app-surface hover-lift flex w-full items-center justify-between rounded-[1.5rem] p-4 text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-300/15">
                <Sparkles className="h-5 w-5 text-cyan-200" />
              </div>
              <div className="text-left">
                <h4 className="font-black">Ask AI</h4>
                <p className="text-xs leading-5 text-slate-300">
                  Summarize chats, suggest replies, translate messages, or explain code.
                </p>
              </div>
            </div>

            <Stars className="h-5 w-5 text-yellow-300" />
          </Link>
        </div>

        <div className="thin-scrollbar flex-1 space-y-2 overflow-y-auto px-4 pb-4 sm:px-5 sm:pb-5">
          {loading ? (
            <UserListLoader count={5} label="Loading chats" />
          ) : filteredUsers.length === 0 ? (
            <div className="app-empty-state rounded-[1.5rem] p-5 text-sm text-slate-300">
              <p className="font-bold text-white">No chats found</p>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                Try a different search, switch filters, or create a group.
              </p>
            </div>
          ) : (
            filteredUsers.map((user) => {
              const userId = getChatId(user);
              const isSelected = getChatId(selectedUser) === userId;
              const unreadCount = getUnreadCount(user);
              const isOnline = Boolean(user?.status);
              const isDragging = draggingUserId === userId;
              const isDragOver = dragOverUserId === userId;

              return (
                <div
                  key={userId}
                  draggable
                  onDragStart={(event) => handleUserDragStart(event, user)}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    setDragOverUserId(userId);
                  }}
                  onDragLeave={() => setDragOverUserId("")}
                  onDrop={(event) => handleUserDrop(event, user)}
                  onDragEnd={() => {
                    setDraggingUserId("");
                    setDragOverUserId("");
                  }}
                  onClick={() => {
                    setSelectedUser(user);
                    setTypingUser(null);
                    getMessages(user);
                    markMessagesRead(user);
                  }}
                  className={`app-list-item group flex cursor-grab items-center gap-3 rounded-[1.25rem] p-3 active:cursor-grabbing sm:rounded-[1.5rem] sm:p-3.5 ${
                    isSelected
                      ? "border-cyan-300/35 bg-cyan-300/[0.12] shadow-lg shadow-cyan-950/20"
                      : ""
                  } ${
                    isDragOver
                      ? "translate-x-1 border-cyan-300/45 ring-2 ring-cyan-300/25"
                      : ""
                  } ${
                    isDragging ? "scale-[0.98] opacity-55" : ""
                  }`}
                >
                  <GripVertical className="h-4 w-4 shrink-0 text-slate-500 transition group-hover:text-cyan-200" />
                  <div className="relative">
                    <div className="relative h-12 w-12 overflow-hidden rounded-[1.15rem] ring-1 ring-white/10 sm:h-14 sm:w-14 sm:rounded-[1.35rem]">
                      <Image
                        src={user?.avatar || "/avatar.jpg"}
                        alt={user?.username || user?.name || "User"}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    </div>

                    {unreadCount > 0 && (
                      <span className="missed-message-badge absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white shadow-lg">
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
                      <h4 className="flex items-center gap-1 truncate font-black">
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
                          typing now
                        </p>
                      ) : user?.isPublic ? (
                        <p className="truncate">
                          <span className="font-bold text-cyan-300">
                            Public •
                          </span>{" "}
                          All members
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

        <div onClick={() => setopen(true)} className="border-t border-white/10 p-4 sm:p-5">
          <div className="app-button-primary flex w-full py-3.5 font-semibold">
            <Plus className="h-5 w-5" />
            <span>Add Group</span>
          </div>
        </div>

        {open && <CreateGroup open={open} close={() => setopen(false)} />}
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
          className={`min-h-[calc(100svh_-_4rem)] transition-all duration-300 md:h-[calc(100svh_-_4rem)] lg:h-screen ${
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
              notifyOnIncoming={false}
              onBack={() => setSelectedUser(null)}
            />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-slate-400">
              <div className="app-premium-card max-w-md rounded-[1.75rem] px-6 py-6 text-center">
                <h2 className="text-xl font-black text-white">
                  Choose a conversation
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Pick a friend, group, or room to start messaging with online
                  presence, media, AI help, and calls.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
