"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import VoiceRecorder from "./VoiceRecorder";
import CallModal from "./CallModal";
import { socket } from "../socket";
import Cookies from "js-cookie";
import Image from "next/image";
import axios from "axios";
import { playNotificationSound } from "../../lib/clientPreferences";
import { allEmotionEmojis } from "../../lib/emotions";
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
  Briefcase,
  Check,
  CheckCheck,
  LogOut,
  MapPin,
  Trash2,
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

function listHasEntity(list = [], id = "") {
  return Boolean(id) && list.some((item) => getEntityId(item) === id);
}

function getFriendshipStatus(currentUser, selectedUser) {
  if (!currentUser?._id || !selectedUser?._id || selectedUser?.type === "group") {
    return "none";
  }

  const currentUserId = getEntityId(currentUser);
  const selectedUserId = getEntityId(selectedUser);

  if (
    listHasEntity(currentUser.friends, selectedUserId) ||
    listHasEntity(selectedUser.friends, currentUserId)
  ) {
    return "friends";
  }

  if (
    listHasEntity(currentUser.friendRequests, selectedUserId) ||
    listHasEntity(selectedUser.sentFriendRequests, currentUserId)
  ) {
    return "incoming";
  }

  if (
    listHasEntity(currentUser.sentFriendRequests, selectedUserId) ||
    listHasEntity(selectedUser.friendRequests, currentUserId)
  ) {
    return "pending";
  }

  return "none";
}

function getMessageDbId(message) {
  return String(message?._id || message?.id || "");
}

function messagesMatch(message, incomingMessage) {
  const messageDbId = getMessageDbId(message);
  const incomingDbId = getMessageDbId(incomingMessage);

  return (
    (incomingMessage?.clientId && message?.clientId === incomingMessage.clientId) ||
    (incomingDbId && messageDbId === incomingDbId) ||
    (incomingMessage?.tempId && message?.tempId === incomingMessage.tempId)
  );
}

function mergeMessage(message = {}, incomingMessage = {}) {
  return {
    ...message,
    ...incomingMessage,
    pending:
      typeof incomingMessage.pending === "boolean"
        ? incomingMessage.pending
        : Boolean(message.pending),
    failed:
      typeof incomingMessage.failed === "boolean"
        ? incomingMessage.failed
        : Boolean(message.failed),
  };
}

function upsertMessageList(list = [], incomingMessage) {
  if (!incomingMessage) return list;

  const index = list.findIndex((message) =>
    messagesMatch(message, incomingMessage)
  );

  if (index === -1) {
    return [...list, mergeMessage({}, incomingMessage)];
  }

  const next = [...list];
  next[index] = mergeMessage(next[index], incomingMessage);
  return next;
}

function removeMessageFromList(list = [], messageId = "") {
  if (!messageId) return list;

  return list.filter((message) => getMessageDbId(message) !== messageId);
}

function getReactionSummary(reactions = []) {
  const counts = new Map();

  reactions.forEach((reaction) => {
    if (!reaction?.emoji) return;
    counts.set(reaction.emoji, (counts.get(reaction.emoji) || 0) + 1);
  });

  return Array.from(counts.entries()).map(([emoji, count]) => ({
    emoji,
    count,
  }));
}

function markMessagesReadInList(list = [], data = {}) {
  if (!data.sender || !data.reader) return list;

  return list.map((message) => {
    const sender = message.sender || message.username || "";
    const receiver = message.receiver || message.recname || "";

    if (sender === data.sender && receiver === data.reader) {
      return { ...message, read: true };
    }

    return message;
  });
}

function isMessageInChat(message, chat, currentUsername) {
  if (!message || !chat || !currentUsername) return false;

  const chatName =
    chat.type === "group" ? chat.name : chat.username || chat.name || "";

  if (!chatName) return false;

  if (chat.type === "group") {
    return (
      message.type === "group" &&
      (message.chat === chatName ||
        message.receiver === chatName ||
        message.recname === chatName)
    );
  }

  const sender = message.sender || message.username || "";
  const receiver = message.receiver || message.recname || "";

  return (
    (sender === currentUsername && receiver === chatName) ||
    (sender === chatName && receiver === currentUsername)
  );
}

export default function ChatWindow({
  selectedUser,
  selectedMessages = [],
  setMessages: setParentMessages,
  notifyOnIncoming = true,
  onBack,
}) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(true);
  const [groupInfo, setGroupInfo] = useState(null);
  const [selectedPresence, setSelectedPresence] = useState(
    Boolean(selectedUser?.status)
  );
  const [showPinnedMessage, setShowPinnedMessage] = useState(true);
  const [callOpen, setCallOpen] = useState(false);
  const [callType, setCallType] = useState("video");
  const [incomingCall, setIncomingCall] = useState(null);
  const [callPeer, setCallPeer] = useState(null);
  const [friendshipOverride, setFriendshipOverride] = useState("");
  const [friendshipMessage, setFriendshipMessage] = useState("");
  const [showMessageEmotions, setShowMessageEmotions] = useState(false);
    
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const messageInputRef = useRef(null);
  const groupAvatarInputRef = useRef(null);
  const typingTimeoutRef = useRef({});
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
  const friendshipStatus =
    friendshipOverride || getFriendshipStatus(currentUser, selectedUser);
  const profileBio =
    selectedUser?.type === "group"
      ? selectedUser?.message || "Group chat"
      : selectedUser?.about || "No bio yet.";
  const conversationNote =
    selectedUser?.message ||
    (selectedUser?.type === "group"
      ? "Group chat with members, shared files, approvals, and room calls."
      : "Realtime messages with media, voice notes, reactions, and calls.");
  
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
      value.startsWith("audio/") ||
      /\.(mp3|m4a|wav|ogg|webm)$/i.test(value)
    ) {
      return "audio";
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
        .filter(
          (msg) =>
            msg.media && getFileType(msg.mediaType || msg.media) !== "unknown"
        )
        .map((msg, index) => ({
          id: msg.clientId || msg.id || `${msg.media}-${index}`,
          url: getFullMediaUrl(msg.media),
          type: getFileType(msg.mediaType || msg.media),
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
    setMediaType("");
    setPreviewUrl("");

    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleFileChange(e) {
    try {
      const file = e.target.files?.[0];
      if (!file || !currentUser?._id) return;

      if (previewUrl) URL.revokeObjectURL(previewUrl);

      setSelectedFile(file);
      setMediaType(file.type || "");
      setPreviewUrl(URL.createObjectURL(file));

      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", currentUser._id);

      setUploading(true);

      const res = await axios.post("/api/mediachat", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMediaUrl(res.data.media || "");
      setMediaType(res.data.mediaType || file.type || "");
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

    if (now - lastTypingTimeRef.current < 70) return;
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

      const action = friendshipStatus === "incoming" ? "accept" : "request";

      const res = await axios.post("/api/addfriend", {
        userId: currentUser._id,
        friendId: selectedUser._id,
        action,
      });

      setFriendshipOverride(res.data?.status || "pending");
      setFriendshipMessage(res.data?.message || "Friend request sent");
    } catch (error) {
      console.error("Add friend failed:", error);
      setFriendshipMessage(
        error?.response?.data?.message || "Could not update friend request"
      );
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

  async function leaveGroup() {
    try {
      if (!currentUserId || selectedUser?.type !== "group") return;

      const res = await axios.post("/api/groupmembers", {
        action: "leave",
        userId: currentUserId,
        groupId: selectedUser._id,
        name: selectedUser.name,
      });

      syncGroupFromResponse(res.data);
    } catch (error) {
      console.error("Leave group failed:", error);
    }
  }

  async function deleteMessage(targetMessage) {
    const messageId = getMessageDbId(targetMessage);

    if (!messageId || !currentUser?.username) return;

    try {
      await axios.delete(`/api/message/${messageId}`, {
        data: { username: currentUser.username },
      });

      setMessages((prev) => removeMessageFromList(prev, messageId));

      if (typeof setParentMessages === "function") {
        setParentMessages((prev) => removeMessageFromList(prev, messageId));
      }

      socket.emit("message-deleted", {
        ...targetMessage,
        _id: messageId,
      });
    } catch (error) {
      console.error("Delete message failed:", error);
    }
  }

  function appendMessageEmoji(emoji) {
    setMessage((prev) => `${prev}${emoji}`);
    setShowMessageEmotions(false);
    messageInputRef.current?.focus();
  }
  const upsertParentMessage = useCallback(
    (incomingMessage) => {
      if (
        typeof setParentMessages !== "function" ||
        !isMessageInChat(incomingMessage, selectedUser, currentUser?.username)
      ) {
        return;
      }

      setParentMessages((prev) => upsertMessageList(prev, incomingMessage));
    },
    [currentUser?.username, selectedUser, setParentMessages]
  );

  const upsertMessage = useCallback(
    (incomingMessage, options = {}) => {
      if (!incomingMessage) return;

      setMessages((prev) => upsertMessageList(prev, incomingMessage));

      if (options.syncParent) {
        upsertParentMessage(incomingMessage);
      }
    },
    [upsertParentMessage]
  );

  function openChatCall(type) {
    if (!selectedUser) return;
    if (selectedUser?.type === "group" && !isGroupMember) return;

    setIncomingCall(null);
    setCallPeer(selectedUser);
    setCallType(type);
    setCallOpen(true);
  }

  function closeChatCall() {
    setCallOpen(false);
    setIncomingCall(null);
    setCallPeer(null);
  }

 async function send() {
  if (!currentUser || !selectedUser) return;
  if (!message.trim() && !mediaUrl) return;
  if (uploading) return;

  const text = message.trim();
  const media = mediaUrl || "";
  const attachedMediaType = mediaType || selectedFile?.type || "";

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
    mediaType: attachedMediaType,

    unread: 1,
    read: false,
    reactions: [],
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
    upsertMessage(newMessage, { syncParent: true });

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
    upsertMessage(finalMessage, { syncParent: true });

    // emit saved message with _id
    socket.emit("message", finalMessage);
  } catch (error) {
    console.error("Send failed:", error);

    const failedMessage = {
      ...newMessage,
      pending: false,
      failed: true,
    };

    upsertMessage(failedMessage, { syncParent: true });
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
    if (!currentUser?.username || selectedUser?.type !== "group" || !selectedUser?.name) {
      return;
    }

    socket.emit("join-room", {
      room: selectedUser.name,
      user: currentUser.username,
    });
  }, [currentUser?.username, selectedUser?.name, selectedUser?.type]);

  useEffect(() => {
    setFriendshipOverride("");
    setFriendshipMessage("");
    setShowPinnedMessage(true);
  }, [selectedUser?._id]);

useEffect(() => {
  setMessages((prev) => {
    const incoming = Array.isArray(selectedMessages) ? selectedMessages : [];

    const merged = [...incoming];

    prev.forEach((oldMsg) => {
      const exists = merged.some((newMsg) => messagesMatch(newMsg, oldMsg));
      const shouldPreserveLocalState =
        (oldMsg.pending || oldMsg.failed) &&
        isMessageInChat(oldMsg, selectedUser, currentUser?.username);

      if (!exists && shouldPreserveLocalState) {
        merged.push(oldMsg);
      }
    });

    return merged;
  });

  setTypingUsers({});
  setSelectedPresence(Boolean(selectedUser?.status));
  setGroupInfo(selectedUser?.type === "group" ? selectedUser : null);
}, [currentUser?.username, selectedMessages, selectedUser]);

  useEffect(() => {
    function onConnect() {
      if (currentUser?.username) {
        socket.emit("user", currentUser.username);
      }
    }

    function onMessage(data) {
      if (!data) return;

      const normalizedMessage = {
        _id: data._id,
        clientId: data.clientId,
        id: data.id || data._id || `${data.sender}-${Date.now()}`,
        sender: data.sender || data.username,
        avatar: data.avatar || "",
        receiver: data.receiver || data.recname || data.chat || "",
        recname: data.recname || data.receiver || data.chat || "",
        message: data.message || "",
        media: data.media || "",
        mediaType: data.mediaType || "",
        type: data.type || "user",
        chat: data.chat || "",
        storyReply: data.storyReply || null,
        read: Boolean(data.read),
        reactions: Array.isArray(data.reactions) ? data.reactions : [],
        createdAt: data.createdAt,
        pending: false,
        failed: false,
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
        upsertMessage(normalizedMessage, { syncParent: true });

        if (notifyOnIncoming && normalizedMessage.sender !== currentUser?.username) {
          playNotificationSound("message");
        }
      }

    }

    function onIncomingCall(data) {
      if (!data?.from || data?.from === currentUser?.username) return;

      playNotificationSound("call");
      setIncomingCall(data);
      setCallType(data.callType || "video");
      setCallPeer(
        selectedUser?.username === data.from
          ? selectedUser
          : { username: data.from, avatar: "/avatar.jpg" }
      );
      setCallOpen(true);
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

      clearTimeout(typingTimeoutRef.current[data.sender]);

      typingTimeoutRef.current[data.sender] = setTimeout(() => {
        setTypingUsers((prev) => {
          const copy = { ...prev };
          delete copy[data.sender];
          return copy;
        });
      }, 650);
    }

    function onPresence(data) {
      if (!data?.username || selectedUser?.type === "group") return;
      if (data.username === selectedUser?.username) {
        setSelectedPresence(Boolean(data.status));
      }
    }

    function onMessagesRead(data) {
      if (selectedUser?.type === "group") return;
      if (
        data?.sender !== currentUser?.username ||
        data?.reader !== selectedUser?.username
      ) {
        return;
      }

      setMessages((prev) => markMessagesReadInList(prev, data));

      if (typeof setParentMessages === "function") {
        setParentMessages((prev) => markMessagesReadInList(prev, data));
      }
    }

    function onMessageDeleted(data) {
      const messageId = getMessageDbId(data);
      if (!messageId) return;

      setMessages((prev) => removeMessageFromList(prev, messageId));

      if (typeof setParentMessages === "function") {
        setParentMessages((prev) => removeMessageFromList(prev, messageId));
      }
    }

    function onMessageReaction(data) {
      if (!isMessageInChat(data, selectedUser, currentUser?.username)) return;
      upsertMessage(data, { syncParent: true });
    }

    socket.on("connect", onConnect);
    socket.on("message", onMessage);
    socket.on("incoming-call", onIncomingCall);
    socket.on("typing", onTyping);
    socket.on("presence", onPresence);
    socket.on("messages-read", onMessagesRead);
    socket.on("message-deleted", onMessageDeleted);
    socket.on("message-reaction", onMessageReaction);

    if (socket.connected) {
      onConnect();
    } else {
      socket.connect();
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("message", onMessage);
      socket.off("incoming-call", onIncomingCall);
      socket.off("typing", onTyping);
      socket.off("presence", onPresence);
      socket.off("messages-read", onMessagesRead);
      socket.off("message-deleted", onMessageDeleted);
      socket.off("message-reaction", onMessageReaction);
      Object.values(typingTimeoutRef.current).forEach(clearTimeout);
      typingTimeoutRef.current = {};
    };
  }, [selectedUser, currentUser, notifyOnIncoming, setParentMessages, upsertMessage]);

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
        <div className="app-empty-state app-scale-in max-w-sm rounded-[1.75rem] px-6 py-5 text-center">
          <p className="font-bold text-white">Choose a conversation</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Your messages, media, and calls will appear here.
          </p>
        </div>
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
        read: false,
        reactions: [],
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
      newMessage.mediaType = data.mediaType || blob.type || "audio/webm";
      newMessage.createdAt = new Date().toISOString();
      newMessage.pending = false;
      newMessage.failed = false;

      upsertMessage(newMessage, { syncParent: true });
      socket.emit("message", newMessage);
    } catch (error) {
      console.error("Voice send failed:", error);
    }
  }
  const typingNames = Object.keys(typingUsers);
  const isComposing = message.length > 0;
  const selectedIsOnline = Boolean(selectedPresence);
  const selectedPresenceLabel =
    selectedUser?.type === "group"
      ? `${activeGroup?.members?.length || 0} members`
      : selectedIsOnline
      ? "Online"
      : "Offline";

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex min-h-[calc(100vh-3.5rem)] overflow-hidden bg-transparent text-white md:h-screen">
        <main className="app-chat-canvas flex min-w-0 flex-1 flex-col border-r border-white/10">
          <header className="app-surface relative z-20 mx-3 mt-3 flex items-center justify-between rounded-[1.5rem] px-4 py-3 md:mx-4 md:px-5">
            <div className="min-w-0 flex-1 flex items-center gap-3">
              <button
                className="app-icon-button rounded-2xl p-2 md:hidden"
                type="button"
                onClick={onBack}
                aria-label="Back to chats"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              <div className="flex min-w-0 cursor-pointer items-center gap-3">
                <div className="relative">
                  <div className="relative h-12 w-12 overflow-hidden rounded-[1.25rem] ring-1 ring-white/10">
                    <Image
                      src={selectedAvatar}
                      alt={selectedChatName || "User"}
                      fill
                      className="object-cover"

                    />
                  </div>
                  {selectedUser?.type !== "group" && (
                    <div
                      className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-[#0a0f0c] ${
                        selectedIsOnline ? "bg-emerald-500" : "bg-slate-500"
                      }`}
                      title={selectedPresenceLabel}
                    />
                  )}
                </div>

                <div className="min-w-0">
                  <h3 className="truncate font-black">{selectedChatName}</h3>

                  <p
                    className={`text-sm ${
                      typingNames.length > 0 ? "text-cyan-200" : "text-slate-400"
                    }`}
                  >
                    {typingNames.length > 0
                      ? `${typingNames.join(", ")} typing now`
                      : selectedPresenceLabel}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              <button
                className="app-icon-button rounded-2xl p-2 disabled:cursor-not-allowed disabled:opacity-40"
                type="button"
                title={
                  selectedUser?.type === "group"
                    ? isGroupMember
                      ? "Group video call"
                      : "Join the group before calling"
                    : "Video call"
                }
                disabled={selectedUser?.type === "group" && !isGroupMember}
                onClick={() => openChatCall("video")}
              >
                <Video className="h-5 w-5" />
              </button>
              <button
                className="app-icon-button rounded-2xl p-2 disabled:cursor-not-allowed disabled:opacity-40"
                type="button"
                title={
                  selectedUser?.type === "group"
                    ? isGroupMember
                      ? "Group voice call"
                      : "Join the group before calling"
                    : "Voice call"
                }
                disabled={selectedUser?.type === "group" && !isGroupMember}
                onClick={() => openChatCall("audio")}
              >
                <Phone className="h-5 w-5" />
              </button>
              <button className="app-icon-button hidden rounded-2xl p-2 sm:flex">
                <Search className="h-5 w-5" />
              </button>
              <button
                onClick={() => setShowContactInfo((prev) => !prev)}
                className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-2 text-cyan-200 transition hover:-translate-y-0.5 hover:bg-cyan-300/15"
                type="button"
              >
                <Info className="h-5 w-5" />
              </button>
            </div>
          </header>

          {showPinnedMessage && (
            <div className="app-section-card relative z-10 mx-3 mt-3 flex items-start justify-between gap-3 rounded-[1.25rem] px-4 py-3 md:mx-4 md:px-5">
              <div className="flex min-w-0 items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-cyan-300/12 text-cyan-200">
                  <Pin className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-black">Conversation brief</h4>
                    <span className="app-mini-pill">
                      {selectedPresenceLabel}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-400">
                    {conversationNote}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPinnedMessage(false)}
                className="app-icon-button shrink-0 rounded-xl p-1.5"
                aria-label="Hide conversation brief"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="thin-scrollbar relative z-10 flex-1 overflow-y-auto px-4 py-6 md:px-6">
            <div className="relative z-10 space-y-6">
              {messages.length === 0 && (
                <div className="grid min-h-[42vh] place-items-center py-8">
                  <div className="app-premium-card max-w-md rounded-[1.75rem] p-6 text-center">
                    <div className="relative z-10 mx-auto h-20 w-20 overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/20 shadow-2xl shadow-black/25">
                      <Image
                        src={selectedAvatar}
                        alt={selectedChatName || "Conversation"}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    </div>
                    <div className="relative z-10 mt-5">
                      <h3 className="text-xl font-black">
                        Start with {selectedChatName || "this chat"}
                      </h3>
                      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-300">
                        Send a message, attach media, record a voice note, or start a call from the controls below.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {messages.map((msg, index) => {
                const isMe =
                  (msg.sender || msg.username) === currentUser?.username;
                const mediaType = getFileType(msg.mediaType || msg.media);
                const mediaSrc = getFullMediaUrl(msg.media);
                const storyReplyType = getFileType(
                  msg.storyReply?.mediaType || msg.storyReply?.mediaUrl
                );
                const messageId = getMessageDbId(msg);
                const reactionSummary = getReactionSummary(msg.reactions || []);
                const showReadReceipt = isMe && msg.type !== "group";

                return (
                  <div
                    key={msg.clientId || msg.id || index}
                    className={`app-message-row group/message flex items-end gap-3 ${
                      isMe ? "justify-end" : "justify-start"
                    }`}
                  >
                    {!isMe && (
                      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-[1rem] ring-1 ring-white/10">
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
                        className={`flex items-end gap-2 ${
                          isMe ? "justify-end" : "justify-start"
                        }`}
                      >
                        {isMe && messageId && !msg.pending && (
                          <button
                            type="button"
                            title="Delete message"
                            onClick={() => deleteMessage(msg)}
                            className="mb-1 rounded-xl p-1.5 text-slate-400 opacity-0 transition hover:bg-red-500/10 hover:text-red-200 group-hover/message:opacity-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}

                        <div
                          className={`app-bubble rounded-2xl px-4 py-3 ${
                            isMe
                              ? "app-message-bubble-out rounded-br-md text-slate-950"
                              : "app-message-bubble-in rounded-bl-md text-slate-100"
                          }`}
                        >
                        {msg.storyReply?.storyId && (
                          <div
                            className={`mb-3 overflow-hidden rounded-2xl border ${
                              isMe
                                ? "border-white/25 bg-black/10"
                                : "border-white/10 bg-black/20"
                            }`}
                          >
                            <div className="flex items-center gap-3 p-2.5">
                              <div className="relative h-12 w-10 shrink-0 overflow-hidden rounded-xl bg-black/30">
                                {storyReplyType === "video" ? (
                                  <video
                                    src={msg.storyReply.mediaUrl}
                                    className="h-full w-full object-cover"
                                    muted
                                    playsInline
                                  />
                                ) : (
                                  <Image
                                    src={msg.storyReply.mediaUrl || "/avatar.jpg"}
                                    alt="status reply"
                                    fill
                                    sizes="40px"
                                    className="object-cover"
                                  />
                                )}
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
                          <div className="mb-3 overflow-hidden rounded-2xl">
                            <Image
                              src={mediaSrc}
                              alt="chat media"
                              width={640}
                              height={420}
                              sizes="(max-width: 768px) 80vw, 520px"
                              className="max-h-[260px] w-full rounded-2xl object-cover"
                            />
                          </div>
                        )}

                        {msg.media && mediaType === "video" && (
                          <div className="mb-3 overflow-hidden rounded-2xl">
                            <video
                              src={mediaSrc}
                              controls
                              className="max-h-[260px] w-full rounded-2xl"
                            />
                          </div>
                        )}

                        {msg.media && mediaType === "audio" && (
                          <audio
                            src={mediaSrc}
                            controls
                            className="mb-3 w-full min-w-[220px]"
                          />
                        )}

                        {msg.media && mediaType === "file" && (
                          <a
                            href={mediaSrc}
                            target="_blank"
                            rel="noreferrer"
                            className="mb-3 flex items-center gap-3 rounded-2xl bg-black/20 px-3 py-3"
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

                      {reactionSummary.length > 0 && (
                        <div
                          className={`flex flex-wrap gap-1 px-1 ${
                            isMe ? "justify-end" : "justify-start"
                          }`}
                        >
                          {reactionSummary.map((reaction) => (
                            <span
                              key={reaction.emoji}
                              className="rounded-full border border-white/10 bg-black/25 px-2 py-0.5 text-xs text-slate-100 shadow-sm"
                            >
                              {reaction.emoji}
                              {reaction.count > 1 ? ` ${reaction.count}` : ""}
                            </span>
                          ))}
                        </div>
                      )}

                      {showReadReceipt && (
                        <div className="flex justify-end px-1">
                          <span
                            className={`flex items-center gap-1 text-[11px] font-semibold ${
                              msg.read
                                ? "read-receipt-pop text-cyan-100"
                                : "text-slate-400"
                            }`}
                          >
                            {msg.read ? (
                              <CheckCheck className="h-3.5 w-3.5" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                            {msg.pending
                              ? "Sending"
                              : msg.failed
                              ? "Failed"
                              : msg.read
                              ? "Read"
                              : "Sent"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {typingNames.length > 0 && (
                <div className="flex items-end gap-3">
                  <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-[1rem] ring-1 ring-white/10">
                    <Image
                      src={selectedAvatar}
                      alt="typing avatar"
                      fill
                      className="object-cover"

                    />
                  </div>

                  <div className="typing-quick-bubble app-bubble rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="relative z-10 mb-1 flex items-center gap-2 text-xs font-bold text-cyan-100">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.8)]" />
                      {typingNames.join(", ")} typing fast
                    </div>

                    <div className="relative z-10 flex items-center gap-1.5">
                      <span className="typing-quick-dot h-2.5 w-2.5 rounded-full bg-cyan-200" />
                      <span className="typing-quick-dot h-2.5 w-2.5 rounded-full bg-emerald-200" />
                      <span className="typing-quick-dot h-2.5 w-2.5 rounded-full bg-amber-200" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          <footer className="app-composer relative z-20 m-3 rounded-[1.5rem] p-3 md:m-4 md:p-4">
            {previewUrl && (
              <div className="app-surface mb-4 rounded-[1.5rem] p-3">
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
                    className="max-h-48 rounded-2xl object-cover"
                  />
                )}

                {selectedFile && getFileType(selectedFile) === "video" && (
                  <video
                    src={previewUrl}
                    controls
                    className="max-h-48 rounded-2xl"
                  />
                )}

                {selectedFile && getFileType(selectedFile) === "file" && (
                  <div className="flex items-center gap-3 rounded-2xl bg-black/20 px-3 py-3">
                    <FileText className="h-5 w-5" />
                    <span className="break-all text-sm">
                      {selectedFile.name}
                    </span>
                  </div>
                )}
              </div>
            )}

            {showMessageEmotions && (
              <div className="app-scale-in mb-3 flex max-h-48 flex-wrap gap-2 overflow-y-auto rounded-[1.25rem] border border-white/10 bg-white/[0.055] p-2">
                {allEmotionEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => appendMessageEmoji(emoji)}
                    className="rounded-xl px-3 py-2 text-lg transition hover:bg-white/10"
                    title={`Add ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={() => inputRef.current?.click()}
                className="app-icon-button hidden rounded-2xl p-3 sm:block"
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
              <VoiceRecorder onSend={sendVoice} />
              <div
                className={`focus-within:border-cyan-300/35 relative flex flex-1 items-center gap-3 overflow-hidden rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition ${
                  isComposing
                    ? "typing-compose-active border-cyan-300/45 bg-cyan-300/10 shadow-[0_0_28px_rgba(34,211,238,0.16)]"
                    : ""
                }`}
              >
                {isComposing && (
                  <>
                    <span className="typing-spark typing-spark-one" aria-hidden="true" />
                    <span className="typing-spark typing-spark-two" aria-hidden="true" />
                    <span className="typing-spark typing-spark-three" aria-hidden="true" />
                  </>
                )}
                <button   className="text-slate-400 transition hover:text-white"
                  type="button"
                  onClick={() => setShowMessageEmotions((prev) => !prev)}
                >
                  <Smile className="h-5 w-5" />
                </button>

                <input
                  ref={messageInputRef}
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
                className={`rounded-2xl bg-cyan-300 p-3 text-slate-950 shadow-lg shadow-cyan-950/20 transition hover:-translate-y-0.5 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50 ${
                  message.trim() || mediaUrl ? "send-ready" : ""
                }`}
                disabled={(!message.trim() && !mediaUrl) || uploading}
                type="button"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </footer>
        </main>

        {showContactInfo && (
        <aside className="app-panel hidden w-[360px] shrink-0 border-l border-white/10 lg:flex lg:flex-col">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
                Profile
              </p>
              <h3 className="mt-1 font-black">Contact Info</h3>
            </div>
            <button
              onClick={() => setShowContactInfo(false)}
              className="app-icon-button rounded-2xl p-2"
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="thin-scrollbar flex-1 overflow-y-auto px-5 py-6">
            <div className="app-premium-card overflow-hidden rounded-[1.75rem] text-center">
              <div className="app-profile-cover relative h-28">
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
              </div>
              <div className="-mt-14 px-4 pb-5">
                <div className="relative mx-auto mb-4 h-28 w-28 overflow-hidden rounded-[1.75rem] border-4 border-[#07111c] bg-[#07111c] shadow-2xl shadow-black/25">
                  <Image
                    src={selectedAvatar}
                    alt="profile"
                    fill
                    className="object-cover"

                  />
                </div>
                {isGroupAdmin && (
                  <button
                    type="button"
                    onClick={() => groupAvatarInputRef.current?.click()}
                    className="app-icon-button mx-auto mb-3 flex rounded-2xl px-3 py-2 text-sm font-bold"
                  >
                    <Upload className="h-4 w-4" />
                    Upload photo
                    <input
                      type="file"
                      onChange={groupavatar}
                      ref={groupAvatarInputRef}
                      className="hidden"
                    />
                  </button>
                )}
                <h2 className="relative z-10 flex items-center justify-center gap-2 text-xl font-black">
                  {selectedChatName}
                  <BadgeCheck className="h-5 w-5 text-sky-400" />
                </h2>

                <p className="relative z-10 mx-auto mt-2 max-w-[260px] whitespace-pre-wrap text-sm leading-6 text-slate-400">
                  {profileBio}
                </p>

                <div className="relative z-10 mt-4 grid grid-cols-2 gap-2 text-xs font-bold text-slate-300">
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                    <p className="text-lg font-black text-white">
                      {sharedMedia.length}
                    </p>
                    Shared
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                    <p className="text-lg font-black text-white">
                      {selectedUser?.type === "group"
                        ? activeGroup?.members?.length || 0
                        : selectedPresenceLabel}
                    </p>
                    {selectedUser?.type === "group" ? "Members" : "Status"}
                  </div>
                </div>

                {selectedUser?.type !== "group" && (
                  <div className="relative z-10 mx-auto mt-4 flex max-w-[260px] flex-col gap-2 text-left text-xs text-slate-300">
                    {selectedUser?.jobTitle && (
                      <p className="flex items-center gap-2 rounded-2xl bg-white/5 px-3 py-2">
                        <Briefcase className="h-4 w-4 text-cyan-200" />
                        <span className="truncate">{selectedUser.jobTitle}</span>
                      </p>
                    )}
                    {selectedUser?.location && (
                      <p className="flex items-center gap-2 rounded-2xl bg-white/5 px-3 py-2">
                        <MapPin className="h-4 w-4 text-cyan-200" />
                        <span className="truncate">{selectedUser.location}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
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
                  <div className="app-media-grid mt-4">
                    {mediaItems.slice(0, 6).map((item) => (
                      <a
                        key={item.id}
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="app-media-tile group"
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
                        className="app-section-card flex items-center gap-3 rounded-2xl p-3 transition hover:-translate-y-0.5 hover:bg-white/10"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-300/15 text-cyan-200">
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
              <div className="mt-5 space-y-2">
                <button
                  onClick={addFriend}
                  disabled={friendshipStatus === "friends" || friendshipStatus === "pending"}
                  className="flex items-center gap-2 rounded-lg bg-cyan-300 px-4 py-2 font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-slate-400"
                  type="button"
                >
                  {friendshipStatus === "friends" && <Check className="h-4 w-4" />}
                  {friendshipStatus !== "friends" && <UserPlus className="h-4 w-4" />}
                  {friendshipStatus === "friends"
                    ? "Friends"
                    : friendshipStatus === "pending"
                    ? "Request Sent"
                    : friendshipStatus === "incoming"
                    ? "Accept Friend Request"
                    : "Add Friend"}
                </button>
                {friendshipMessage && (
                  <p className="text-xs text-slate-400">{friendshipMessage}</p>
                )}
              </div>
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

                {isGroupMember && !isGroupAdmin && (
                  <button
                    onClick={leaveGroup}
                    className="flex items-center gap-2 rounded-lg border border-red-400/20 bg-red-500/10 px-4 py-2 font-semibold text-red-100 transition hover:-translate-y-0.5 hover:bg-red-500/20"
                    type="button"
                  >
                    <LogOut className="h-4 w-4" />
                    Leave Group
                  </button>
                )}
              </div>
            )}
          </div>
        </aside>
        )}
      </div>
      <CallModal
        open={callOpen}
        onClose={closeChatCall}
        socket={socket}
        currentUser={currentUser}
        selectedUser={callPeer || selectedUser}
        incomingCall={incomingCall}
        callType={callType}
      />
    </div>
  );
}
