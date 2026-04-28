"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import VoiceRecorder from "./VoiceRecorder";
import { socket } from "../socket";
import Cookies from "js-cookie";
import Image from "next/image";
import axios from "axios";
import {
  ArrowLeft,
  Video,
  Phone,
  Search,
  Info,
  Pin,
  X,
  Plus,
  Smile,
  Paperclip,
  Send,
  BadgeCheck,
  Check,
  Users,
  FileText,
  Upload,
  UserMinus,
  UserPlus,
} from "lucide-react";

function getEntityId(entity) {
  if (!entity) return "";
  if (typeof entity === "string") return entity;
  return entity._id?.toString?.() || entity.toString?.() || "";
}

export default function ChatWindow({ selectedUser, selectedMessages = [] }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [mediaUrl, setMediaUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(true);
  const [groupInfo, setGroupInfo] = useState(null);
  const [selectedPresence, setSelectedPresence] = useState(
    Boolean(selectedUser?.status)
  );
    
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const groupAvatarInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const lastTypingTimeRef = useRef(0);

  const currentUser = useMemo(() => {
    try {
      const cookieUser = Cookies.get("user");
      if (!cookieUser) return null;
      const parsedUser = JSON.parse(cookieUser);
      return Array.isArray(parsedUser) ? parsedUser[0] : parsedUser;
    } catch (error) {
      console.error("Invalid user cookie:", error);
      return null;
    }
  }, []);

  const activeGroup =
    selectedUser?.type === "group" ? groupInfo || selectedUser : null;
  const adminId = getEntityId(activeGroup?.admin);
  const currentUserId = getEntityId(currentUser);
  const isGroupAdmin =
    Boolean(activeGroup) && Boolean(currentUserId) && adminId === currentUserId;
  const isGroupMember =
    Boolean(activeGroup) &&
    (activeGroup.members || []).some(
      (member) => getEntityId(member) === currentUserId
    );
  const hasPendingJoinRequest =
    Boolean(activeGroup) &&
    (activeGroup.approve || []).some(
      (member) => getEntityId(member) === currentUserId
    );
  const selectedChat = activeGroup || selectedUser;
  
  async function groupavatar(e) {
    try {
      const file = e.target.files?.[0];
      if (!file || selectedChat?.type !== "group" || !selectedChat?.name) {
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", selectedChat.name);

      const res = await axios.post("/api/groupavatar", formData);
      setGroupInfo((prev) =>
        prev ? { ...prev, avatar: res.data?.avatar || prev.avatar } : prev
      );
    } catch (error) {
      console.error("Group avatar upload failed:", error);
    } finally {
      e.target.value = "";
    }
  }

  const selectedChatName =
    selectedChat?.type === "group"
      ? selectedChat?.name
      : selectedChat?.username || "";

  const selectedAvatar =
    selectedChat?.avatar ||
    "https://cdn-icons-png.flaticon.com/512/4712/4712027.png";

  const getFullMediaUrl = useCallback((path = "") => {
    if (!path) return "";
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    return path.startsWith("/") ? path : `/${path}`;
  }, []);

  const getFileType = useCallback((fileOrUrl = "") => {
    if (!fileOrUrl) return "unknown";

    const value =
      typeof fileOrUrl === "string"
        ? fileOrUrl.toLowerCase()
        : fileOrUrl?.type?.toLowerCase() || "";

    if (
      value.startsWith("image/") ||
      /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(value)
    ) {
      return "image";
    }

    if (
      value.startsWith("video/") ||
      /\.(mp4|webm|ogg|mov|avi|mkv)$/i.test(value)
    ) {
      return "video";
    }

    if (
      value.includes("application/pdf") ||
      value.includes("application/msword") ||
      value.includes(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) ||
      /\.(pdf|doc|docx|txt)$/i.test(value)
    ) {
      return "file";
    }

    return "unknown";
  }, []);

  const sharedMedia = useMemo(
    () =>
      messages
        .filter((msg) => msg.media && getFileType(msg.media) !== "unknown")
        .map((msg, index) => ({
          id: msg.clientId || msg.id || `${msg.media}-${index}`,
          url: getFullMediaUrl(msg.media),
          type: getFileType(msg.media),
          sender: msg.sender || msg.username || "",
          name: msg.media?.split("/").pop() || "Shared file",
        })),
    [messages, getFileType, getFullMediaUrl]
  );

  const mediaItems = sharedMedia.filter((item) =>
    ["image", "video"].includes(item.type)
  );
  const fileItems = sharedMedia.filter((item) => item.type === "file");

  function clearMedia() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);

    setSelectedFile(null);
    setMediaUrl("");
    setPreviewUrl("");

    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleFileChange(e) {
    try {
      const file = e.target.files?.[0];
      if (!file || !currentUser?._id) return;

      if (previewUrl) URL.revokeObjectURL(previewUrl);

      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));

      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", currentUser._id);

      setUploading(true);

      const res = await axios.post("/api/mediachat", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMediaUrl(res.data.media || "");
    } catch (error) {
      console.error("Upload failed:", error);
      clearMedia();
    } finally {
      setUploading(false);
    }
  }

  function emitTyping() {
    if (!currentUser || !selectedUser) return;

    const now = Date.now();

    if (now - lastTypingTimeRef.current < 700) return;
    lastTypingTimeRef.current = now;

    const isGroup = selectedUser?.type === "group";

    socket.emit("typing", {
      sender: currentUser.username,
      avatar: currentUser.avatar,
      receiver: isGroup ? selectedUser.name : selectedUser.username,
      chat: isGroup ? selectedUser.name : "",
      type: isGroup ? "group" : "user",
    });
  }

  async function addFriend() {
    try {
      if (!currentUser?._id || !selectedUser?._id) return;

      await axios.post("/api/addfriend", {
        userId: currentUser._id,
        friendId: selectedUser._id,
      });
    } catch (error) {
      console.error("Add friend failed:", error);
    }
  }

  function syncGroupFromResponse(data) {
    if (data?.group) {
      setGroupInfo(data.group);
    }
  }

  async function joinGroup() {
    try {
      if (!currentUserId || selectedUser?.type !== "group") return;

      const res = await axios.post("/api/joingroup", {
        userId: currentUserId,
        groupId: selectedUser._id,
        name: selectedUser.name,
      });

      syncGroupFromResponse(res.data);
    } catch (error) {
      console.error("Join group failed:", error);
    }
  }

  async function approveGroupMember(userId) {
    try {
      if (!currentUserId || !userId || selectedUser?.type !== "group") return;

      const res = await axios.post("/api/approvegroup", {
        userId,
        adminId: currentUserId,
        groupId: selectedUser._id,
        name: selectedUser.name,
      });

      syncGroupFromResponse(res.data);
    } catch (error) {
      console.error("Approve group member failed:", error);
    }
  }

  async function removeGroupMember(userId) {
    try {
      if (!currentUserId || !userId || selectedUser?.type !== "group") return;

      const res = await axios.post("/api/groupmembers", {
        action: "remove",
        userId,
        adminId: currentUserId,
        groupId: selectedUser._id,
        name: selectedUser.name,
      });

      syncGroupFromResponse(res.data);
    } catch (error) {
      console.error("Remove group member failed:", error);
    }
  }
const getMessageId = (msg) => {
  return String(msg?._id || msg?.id || msg?.clientId || "");
};

const upsertMessage = useCallback((incomingMessage) => {
  if (!incomingMessage) return;

  setMessages((prev) => {
    const incomingClientId = incomingMessage.clientId;
    const incomingDbId = incomingMessage._id || incomingMessage.id;

    const index = prev.findIndex((msg) => {
      const msgClientId = msg.clientId;
      const msgDbId = msg._id || msg.id;

      return (
        (incomingClientId && msgClientId === incomingClientId) ||
        (incomingDbId && String(msgDbId) === String(incomingDbId))
      );
    });

    if (index !== -1) {
      const next = [...prev];
      next[index] = {
        ...prev[index],
        ...incomingMessage,
        pending: false,
        failed: false,
      };
      return next;
    }

    return [
      ...prev,
      {
        ...incomingMessage,
        pending: false,
        failed: false,
      },
    ];
  });
}, [setMessages]);
  const appendMessageIfNotExists = useCallback((incomingMessage) => {
    setMessages((prev) => {
      const exists = prev.some(
        (msg) =>
          msg.clientId === incomingMessage.clientId ||
          msg.id === incomingMessage.id ||
          (msg.sender === incomingMessage.sender &&
            msg.receiver === incomingMessage.receiver &&
            msg.message === incomingMessage.message &&
            msg.media === incomingMessage.media &&
            msg.type === incomingMessage.type)
      );

      if (exists) return prev;
      return [...prev, incomingMessage];
    });
  }, []);

 async function send() {
  if (!currentUser || !selectedUser) return;
  if (!message.trim() && !mediaUrl) return;
  if (uploading) return;

  const text = message.trim();
  const media = mediaUrl || "";

  const isGroup = selectedUser?.type === "group";

  if (isGroup && !isGroupMember) {
    if (!hasPendingJoinRequest) {
      await joinGroup();
    }

    return;
  }

  const clientId = `${currentUser._id}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  const newMessage = {
    clientId,
    sender: currentUser.username,
    avatar: currentUser.avatar || "/avatar.jpg",

    receiver: isGroup ? selectedUser.name : selectedUser.username,
    recname: isGroup ? selectedUser.name : selectedUser.username,

    message: text,
    media,

    unread: 1,
    type: isGroup ? "group" : "user",
    chat: isGroup ? selectedUser.name : "",

    createdAt: new Date().toISOString(),
    pending: true,
  };

  try {
    // clear input immediately
    setMessage("");
    clearMedia();

    // show message instantly
    upsertMessage(newMessage);

    if (isGroup) {
      socket.emit("group", {
        room: selectedUser.name,
        user: currentUser.username,
      });
    }

    // save in DB first
    const res = await axios.post("/api/message", newMessage);

    const savedMessage = res.data?.message || res.data;

    const finalMessage = {
      ...newMessage,
      ...savedMessage,
      clientId,
      pending: false,
    };

    // replace pending message with saved message
    upsertMessage(finalMessage);

    // emit saved message with _id
    socket.emit("message", finalMessage);
  } catch (error) {
    console.error("Send failed:", error);

    setMessages((prev) =>
      prev.map((msg) =>
        msg.clientId === clientId
          ? {
              ...msg,
              pending: false,
              failed: true,
            }
          : msg
      )
    );
  }
}

  useEffect(() => {
    if (!currentUser?.username) return;

    if (socket.connected) {
      socket.emit("user", currentUser.username);
    } else {
      socket.connect();
    }
  }, [currentUser]);

useEffect(() => {
  setMessages((prev) => {
    const incoming = Array.isArray(selectedMessages) ? selectedMessages : [];

    const merged = [...incoming];

    prev.forEach((oldMsg) => {
      const exists = merged.some((newMsg) => {
        return (
          (oldMsg._id && newMsg._id && String(oldMsg._id) === String(newMsg._id)) ||
          (oldMsg.id && newMsg.id && String(oldMsg.id) === String(newMsg.id)) ||
          (oldMsg.clientId &&
            newMsg.clientId &&
            String(oldMsg.clientId) === String(newMsg.clientId))
        );
      });

      if (!exists && (oldMsg.pending || oldMsg.failed)) {
        merged.push(oldMsg);
      }
    });

    return merged;
  });

  setTypingUsers({});
  setSelectedPresence(Boolean(selectedUser?.status));
  setGroupInfo(selectedUser?.type === "group" ? selectedUser : null);
}, [selectedMessages, selectedUser?._id]);

  useEffect(() => {
    function onConnect() {
      if (currentUser?.username) {
        socket.emit("user", currentUser.username);
      }
    }

    function onMessage(data) {
      if (!data) return;

      const normalizedMessage = {
        clientId: data.clientId,
        id: data.id || data._id || `${data.sender}-${Date.now()}`,
        sender: data.sender || data.username,
        avatar: data.avatar || "",
        receiver: data.receiver || data.recname || data.chat || "",
        recname: data.recname || data.receiver || data.chat || "",
        message: data.message || "",
        media: data.media || "",
        type: data.type || "user",
        chat: data.chat || "",
        storyReply: data.storyReply || null,
      };

      const isCurrentChatGroup =
        selectedUser?.type === "group" &&
        (normalizedMessage.receiver === selectedUser.name ||
          normalizedMessage.chat === selectedUser.name);

      const isCurrentPrivateChat =
        selectedUser?.type !== "group" &&
        ((normalizedMessage.sender === currentUser?.username &&
          normalizedMessage.receiver === selectedUser?.username) ||
          (normalizedMessage.sender === selectedUser?.username &&
            normalizedMessage.receiver === currentUser?.username));

      if (isCurrentChatGroup || isCurrentPrivateChat) {
        appendMessageIfNotExists(normalizedMessage);
      }

    }

    function onTyping(data) {
      if (!data || data.sender === currentUser?.username) return;

      const isCurrentGroup =
        selectedUser?.type === "group" && data.chat === selectedUser.name;

      const isCurrentPrivate =
        selectedUser?.type !== "group" &&
        data.sender === selectedUser?.username &&
        data.receiver === currentUser?.username;

      if (!isCurrentGroup && !isCurrentPrivate) return;

      setTypingUsers((prev) => ({
        ...prev,
        [data.sender]: true,
      }));

      clearTimeout(typingTimeoutRef.current);

      typingTimeoutRef.current = setTimeout(() => {
        setTypingUsers((prev) => {
          const copy = { ...prev };
          delete copy[data.sender];
          return copy;
        });
      }, 1500);
    }

    function onPresence(data) {
      if (!data?.username || selectedUser?.type === "group") return;
      if (data.username === selectedUser?.username) {
        setSelectedPresence(Boolean(data.status));
      }
    }

    socket.on("connect", onConnect);
    socket.on("message", onMessage);
    socket.on("typing", onTyping);
    socket.on("presence", onPresence);

    if (socket.connected) {
      onConnect();
    } else {
      socket.connect();
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("message", onMessage);
      socket.off("typing", onTyping);
      socket.off("presence", onPresence);
      clearTimeout(typingTimeoutRef.current);
    };
  }, [selectedUser, currentUser, appendMessageIfNotExists]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (!selectedUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent text-white">
        <p className="text-slate-400">Select a user to start chatting.</p>
      </div>
    );
  }
  async function sendVoice(blob) {
    try {
      if (!blob || !currentUser || !selectedUser) return;

      const isGroup = selectedUser?.type === "group";
      const receiver = isGroup ? selectedUser?.name : selectedUser?.username;
      if (!receiver) return;

      if (isGroup && !isGroupMember) {
        if (!hasPendingJoinRequest) {
          await joinGroup();
        }

        return;
      }

      const formData = new FormData();
      const clientId = `${currentUser._id}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      const newMessage = {
        clientId,
        sender: currentUser.username,
        avatar: currentUser.avatar,
        receiver,
        recname: receiver,
        message: "",
        unread: 1,
        type: isGroup ? "group" : "user",
        chat: isGroup ? receiver : "",
      };

      formData.append("file", blob);
      formData.append("sender", newMessage.sender);
      formData.append("avatar", newMessage.avatar || "");
      formData.append("receiver", newMessage.receiver);
      formData.append("message", "");

      const res = await fetch("/api/voiceupload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Voice upload failed");
      }

      const data = await res.json();
      newMessage.media = data.url;

      appendMessageIfNotExists(newMessage);
      socket.emit("message", newMessage);
    } catch (error) {
      console.error("Voice send failed:", error);
    }
  }
  const typingNames = Object.keys(typingUsers);
  const selectedIsOnline = Boolean(selectedPresence);
  const selectedPresenceLabel =
    selectedUser?.type === "group"
      ? `${activeGroup?.members?.length || 0} members`
      : selectedIsOnline
      ? "Online"
      : "Offline";

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex min-h-[54vh] overflow-hidden bg-transparent text-white md:h-screen">
        <main className="flex min-w-0 flex-1 flex-col border-r border-white/10">
          <header className="flex items-center justify-between border-b border-white/10 bg-white/[0.025] px-4 py-4 backdrop-blur md:px-6">
            <div className="flex items-center gap-3">
              <button className="rounded-lg p-2 transition hover:bg-white/10 md:hidden">
                <ArrowLeft className="h-5 w-5" />
              </button>

              <div className="flex cursor-pointer items-center gap-3">
                <div className="relative">
                  <div className="relative h-11 w-11 overflow-hidden rounded-full">
                    <Image
                      src={selectedAvatar}
                      alt={selectedChatName || "User"}
                      fill
                      className="object-cover"

                    />
                  </div>
                  {selectedUser?.type !== "group" && (
                    <div
                      className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#0a0f0c] ${
                        selectedIsOnline ? "bg-emerald-500" : "bg-slate-500"
                      }`}
                      title={selectedPresenceLabel}
                    />
                  )}
                </div>

                <div>
                  <h3 className="font-semibold">{selectedChatName}</h3>

                  <p className="text-sm text-slate-400">
                    {typingNames.length > 0
                      ? `${typingNames.join(", ")} typing...`
                      : selectedPresenceLabel}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="hidden rounded-lg p-2 transition hover:-translate-y-0.5 hover:bg-white/10 sm:flex">
                <Video className="h-5 w-5" />
              </button>
              <button className="hidden rounded-lg p-2 transition hover:-translate-y-0.5 hover:bg-white/10 sm:flex">
                <Phone className="h-5 w-5" />
              </button>
              <button className="rounded-lg p-2 transition hover:-translate-y-0.5 hover:bg-white/10">
                <Search className="h-5 w-5" />
              </button>
              <button
                onClick={() => setShowContactInfo((prev) => !prev)}
                className="rounded-lg p-2 text-cyan-200 transition hover:-translate-y-0.5 hover:bg-white/10"
                type="button"
              >
                <Info className="h-5 w-5" />
              </button>
            </div>
          </header>

          <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.045] px-4 py-3 md:px-6">
            <div className="flex items-start gap-3">
              <Pin className="mt-0.5 h-4 w-4 text-cyan-200" />
              <div>
                <h4 className="text-sm font-semibold">Pinned Message</h4>
                <p className="text-sm text-slate-400">
                  {selectedUser.message || "No pinned message"}
                </p>
              </div>
            </div>

            <button className="rounded-lg p-1.5 transition hover:bg-white/10">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="thin-scrollbar flex-1 overflow-y-auto px-4 py-6 md:px-6">
            <div className="relative z-10 space-y-6">
              {messages.length === 0 && (
                <div className="flex items-end gap-3">
                  <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full">
                    <Image
                      src={selectedAvatar}
                      alt="avatar"
                      fill
                      className="object-cover"

                    />
                  </div>

                  <div className="flex max-w-[85%] flex-col gap-1 md:max-w-[70%]">
                    <div className="rounded-lg rounded-bl-sm bg-white/10 px-4 py-3">
                      <p className="text-sm leading-6 text-slate-100">
                        Hello! Start your conversation here.
                      </p>
                      <span className="mt-2 block text-xs text-slate-400">
                        Now
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {messages.map((msg, index) => {
                const isMe =
                  (msg.sender || msg.username) === currentUser?.username;
                const mediaType = getFileType(msg.media);
                const mediaSrc = getFullMediaUrl(msg.media);

                return (
                  <div
                    key={msg.clientId || msg.id || index}
                    className={`flex items-end gap-3 ${
                      isMe ? "justify-end" : "justify-start"
                    }`}
                  >
                    {!isMe && (
                      <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full">
                        <Image
                          src={msg.avatar || selectedAvatar}
                          alt={msg.sender || "avatar"}
                          fill
                          className="object-cover"

                        />
                      </div>
                    )}

                    <div className="flex max-w-[85%] flex-col gap-1 md:max-w-[70%]">
                      {!isMe && msg.type === "group" && (
                        <span className="px-1 text-xs text-cyan-200">
                          {msg.sender}
                        </span>
                      )}

                      <div
                        className={`rounded-lg px-4 py-3 ${
                          isMe
                            ? "rounded-br-sm bg-cyan-300 text-slate-950"
                            : "rounded-bl-sm bg-white/10 text-slate-100"
                        }`}
                      >
                        {msg.storyReply?.storyId && (
                          <div
                            className={`mb-3 overflow-hidden rounded-lg border ${
                              isMe
                                ? "border-white/25 bg-black/10"
                                : "border-white/10 bg-black/20"
                            }`}
                          >
                            <div className="flex items-center gap-3 p-2.5">
                              <div className="relative h-12 w-10 shrink-0 overflow-hidden rounded-lg bg-black/30">
                                <Image
                                  src={msg.storyReply.mediaUrl || "/avatar.jpg"}
                                  alt="status reply"
                                  fill
                                  sizes="40px"
                                  className="object-cover"
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold uppercase opacity-80">
                                  Replied to status
                                </p>
                                <p className="truncate text-xs opacity-70">
                                  {msg.storyReply.caption ||
                                    `Status by ${msg.storyReply.owner || "user"}`}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {msg.media && mediaType === "image" && (
                          <div className="mb-3 overflow-hidden rounded-lg">
                            <Image
                              src={mediaSrc}
                              alt="chat media"
                              width={640}
                              height={420}
                              sizes="(max-width: 768px) 80vw, 520px"
                              className="max-h-[260px] w-full rounded-lg object-cover"
                            />
                          </div>
                        )}

                        {msg.media && mediaType === "video" && (
                          <div className="mb-3 overflow-hidden rounded-xl">
                            <video
                              src={mediaSrc}
                              controls
                              className="max-h-[260px] w-full rounded-lg"
                            />
                          </div>
                        )}

                        {msg.media && mediaType === "file" && (
                          <a
                            href={mediaSrc}
                            target="_blank"
                            rel="noreferrer"
                            className="mb-3 flex items-center gap-3 rounded-lg bg-black/20 px-3 py-3"
                          >
                            <FileText className="h-5 w-5" />
                            <span className="break-all text-sm">Open file</span>
                          </a>
                        )}

                        {msg.message && (
                          <p className="break-words text-sm leading-6">
                            {msg.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {typingNames.length > 0 && (
                <div className="flex items-end gap-3">
                  <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full">
                    <Image
                      src={selectedAvatar}
                      alt="typing avatar"
                      fill
                      className="object-cover"

                    />
                  </div>

                  <div className="rounded-lg rounded-bl-sm bg-white/10 px-4 py-3">
                    <div className="mb-1 text-xs text-slate-400">
                      {typingNames.join(", ")} typing
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:150ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          <footer className="border-t border-white/10 bg-[#07111c]/90 p-4 backdrop-blur md:p-6">
            {previewUrl && (
              <div className="mb-4 rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm text-slate-300">
                    {uploading ? "Uploading..." : "Media preview"}
                  </p>

                  <button
                    onClick={clearMedia}
                    type="button"
                    className="rounded-lg p-1 transition hover:bg-white/10"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {selectedFile && getFileType(selectedFile) === "image" && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt="preview"
                    className="max-h-48 rounded-lg object-cover"
                  />
                )}

                {selectedFile && getFileType(selectedFile) === "video" && (
                  <video
                    src={previewUrl}
                    controls
                    className="max-h-48 rounded-lg"
                  />
                )}

                {selectedFile && getFileType(selectedFile) === "file" && (
                  <div className="flex items-center gap-3 rounded-lg bg-black/20 px-3 py-3">
                    <FileText className="h-5 w-5" />
                    <span className="break-all text-sm">
                      {selectedFile.name}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={() => inputRef.current?.click()}
                className="rounded-lg border border-white/10 bg-white/5 p-3 transition hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-white/10"
                title="Attach Files"
                type="button"
              >
                <Plus className="h-5 w-5" />
              </button>

              <input
                type="file"
                ref={inputRef}
                onChange={handleFileChange}
                accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                className="hidden"
              />
            <div> 
            <VoiceRecorder onSend={sendVoice }/>

            </div>
              <div className="focus-within:border-cyan-300/35 flex flex-1 items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 transition">
                <button
                  className="text-slate-400 transition hover:text-white"
                  type="button"
                >
                  <Smile className="h-5 w-5" />
                </button>

                <input
                  placeholder="Type a message..."
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none"
                  type="text"
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    emitTyping();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      send();
                    }
                  }}
                />

                <button
                  className="text-slate-400 transition hover:text-white"
                  type="button"
                  onClick={() => inputRef.current?.click()}
                >
                  <Paperclip className="h-5 w-5" />
                </button>
              </div>

              <button
                onClick={send}
                className="rounded-lg bg-cyan-300 p-3 text-slate-950 shadow-lg shadow-cyan-950/20 transition hover:-translate-y-0.5 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={(!message.trim() && !mediaUrl) || uploading}
                type="button"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </footer>
        </main>

        {showContactInfo && (
        <aside className="app-panel hidden w-[320px] shrink-0 lg:flex lg:flex-col">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <h3 className="font-semibold">Contact Info</h3>
            <button
              onClick={() => setShowContactInfo(false)}
              className="rounded-lg p-2 transition hover:-translate-y-0.5 hover:bg-white/10"
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="thin-scrollbar flex-1 overflow-y-auto px-5 py-6">
            <div className="text-center">
              <div className="relative mx-auto mb-4 h-24 w-24 overflow-hidden rounded-full">
                <Image
                  src={selectedAvatar}
                  alt="profile"
                  fill
                  className="object-cover"

                />
              </div>
                     {isGroupAdmin && (
  <div onClick={function(){groupAvatarInputRef.current?.click()}} className="mx-auto mb-3 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 p-2 text-sm transition hover:bg-white/10"> 
    <h1>Upload photo</h1>  <Upload /> 
    
    <input type="file" onChange={groupavatar}  ref={groupAvatarInputRef} className="hidden" />
    
    </div>
  )}
              <h2 className="flex items-center justify-center gap-2 text-lg font-bold">
                {selectedChatName}
                <BadgeCheck className="h-5 w-5 text-sky-400" />
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Contact profile and shared media.
              </p>
            </div>

            <div className="mt-8 flex items-center justify-between">
              <h4 className="font-semibold">Media & Files</h4>
              <span className="text-sm text-cyan-200">
                {sharedMedia.length} items
              </span>
            </div>

            {sharedMedia.length === 0 ? (
              <div className="mt-4 rounded-lg border border-dashed border-white/10 bg-white/5 p-4 text-center text-sm text-slate-400">
                No media or files shared yet.
              </div>
            ) : (
              <>
                {mediaItems.length > 0 && (
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    {mediaItems.slice(0, 6).map((item) => (
                      <a
                        key={item.id}
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group relative aspect-square overflow-hidden rounded-lg bg-white/5"
                      >
                        {item.type === "image" ? (
                          <Image
                            src={item.url}
                            alt="shared media"
                            fill
                            sizes="96px"
                            className="object-cover transition group-hover:scale-105"
                          />
                        ) : (
                          <video
                            src={item.url}
                            className="h-full w-full object-cover transition group-hover:scale-105"
                            muted
                          />
                        )}
                        <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/20" />
                      </a>
                    ))}
                  </div>
                )}

                {fileItems.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {fileItems.slice(0, 4).map((item) => (
                      <a
                        key={item.id}
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 rounded-lg bg-white/5 p-3 transition hover:-translate-y-0.5 hover:bg-white/10"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-300/15 text-cyan-200">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">
                            {item.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {item.sender || "Shared file"}
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </>
            )}

            {selectedUser?.type === "group" && (
              <div className="mt-8 space-y-4 border-b border-white/10 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-cyan-200">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{selectedChatName}</p>
                    <p className="text-xs text-slate-400">
                      {activeGroup?.members?.length || 0} Members
                    </p>
                  </div>
                </div>

                {(activeGroup?.members || []).map((user) => {
                  const memberId = getEntityId(user);
                  const isAdminMember = memberId === adminId;

                  return (
                    <div
                      key={memberId}
                      className="flex items-center justify-between gap-2 rounded-lg p-1 transition hover:bg-white/5"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full">
                          <Image
                            src={user?.avatar || "/avatar.jpg"}
                            alt={user?.username || "Group member"}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs">
                            {user?.username || "Group member"}
                          </p>
                          {isAdminMember && (
                            <p className="text-[10px] text-cyan-200">
                              Admin
                            </p>
                          )}
                        </div>
                      </div>

                      {isGroupAdmin && !isAdminMember && (
                        <button
                          onClick={() => removeGroupMember(memberId)}
                          className="flex shrink-0 items-center gap-1 rounded-lg bg-red-500/15 px-2 py-1 text-[11px] text-red-200 transition hover:bg-red-500/25"
                          type="button"
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {selectedUser?.type !== "group" && (
              <button
                onClick={addFriend}
                className="mt-5 flex items-center gap-2 rounded-lg bg-cyan-300 px-4 py-2 font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-200"
              >
                Add Friend
              </button>
            )}

            {selectedUser?.type === "group" && (
              <div className="mt-5 space-y-3">
                {isGroupAdmin && (activeGroup?.approve || []).length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-slate-200">
                      Pending Requests
                    </h4>

                    {(activeGroup?.approve || []).map((user) => {
                      const pendingUserId = getEntityId(user);

                      return (
                        <div
                          key={pendingUserId}
                          className="flex items-center justify-between gap-2 rounded-lg bg-white/5 p-2"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full">
                              <Image
                                src={user?.avatar || "/avatar.jpg"}
                                alt={user?.username || "Pending member"}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <span className="truncate text-xs">
                              {user?.username || "Pending member"}
                            </span>
                          </div>

                          <button
                            onClick={() => approveGroupMember(pendingUserId)}
                            className="flex shrink-0 items-center gap-1 rounded-lg bg-cyan-300/15 px-2 py-1 text-[11px] text-cyan-100 transition hover:bg-cyan-300/25"
                            type="button"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Approve
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {!isGroupMember && (
                  <button
                    onClick={joinGroup}
                    disabled={hasPendingJoinRequest}
                    className="flex items-center gap-2 rounded-lg bg-cyan-300 px-4 py-2 font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-slate-400"
                    type="button"
                  >
                    <UserPlus className="h-4 w-4" />
                    {hasPendingJoinRequest ? "Request Pending" : "Join Group"}
                  </button>
                )}
              </div>
            )}
          </div>
        </aside>
        )}
      </div>
    </div>
  );
}
