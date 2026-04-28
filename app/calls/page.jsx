"use client";

import Image from "next/image";
import Cookies from "js-cookie";
import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  MoreVertical,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  Video,
  Wifi,
} from "lucide-react";

import Sidebar from "../components/Sidebar";
import CallModal from "../components/CallModal";
import {socket }from "../socket";

export default function CallsPage() {
  const [selected, setSelected] = useState(null);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [callOpen, setCallOpen] = useState(false);
  const [callType, setCallType] = useState("video");
  const [incomingCall, setIncomingCall] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const cookieUser = Cookies.get("user");

    if (cookieUser) {
      try {
        const parsedUser = JSON.parse(cookieUser);
        setCurrentUser(parsedUser);

        if (parsedUser?.username) {
          socket.emit("user", parsedUser.username);
        }
      } catch (err) {
        console.error("Invalid user cookie:", err);
      }
    }
  }, []);

  useEffect(() => {
    async function getUsers() {
      try {
        setLoading(true);

        const res = await fetch("/api/users", { cache: "no-store" });
        const data = await res.json();

        setUsers(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }

    getUsers();
  }, []);

  useEffect(() => {
    function handleIncomingCall(data) {
      setIncomingCall(data);
      setCallType(data?.callType || "video");

      const caller =
        users.find((u) => u.username === data?.from) || {
          username: data?.from,
        };

      setSelected(caller);
      setCallOpen(true);
    }

    socket.on("incoming-call", handleIncomingCall);

    return () => {
      socket.off("incoming-call", handleIncomingCall);
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const username = user?.username || "";

      if (currentUser?.username && username === currentUser.username) {
        return false;
      }

      return username.toLowerCase().includes(search.trim().toLowerCase());
    });
  }, [users, search, currentUser]);

  function startCall(user, type) {
    setSelected(user);
    setIncomingCall(null);
    setCallType(type);
    setCallOpen(true);
  }

  function closeCall() {
    setCallOpen(false);
    setIncomingCall(null);
  }

  return (
    <div className="app-shell grid min-h-screen grid-cols-1 pb-14 md:grid-cols-[minmax(18rem,23rem)_1fr] lg:grid-cols-[4.5rem_minmax(19rem,24rem)_1fr] lg:pb-0">
      <Sidebar />

      <aside className="app-panel flex min-h-[46vh] w-full flex-col border-b text-white md:min-h-screen md:border-b-0">
        <div className="border-b border-white/10 p-4">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-300/15 text-cyan-200">
                  <Phone className="h-4 w-4" />
                </span>

                <p className="text-xs font-semibold uppercase tracking-[2px] text-cyan-200/70">
                  Voice & Video
                </p>
              </div>

              <h2 className="text-2xl font-black tracking-tight">Calls</h2>
            </div>

            <button
              type="button"
              className="rounded-xl border border-white/10 bg-white/[0.04] p-2 text-slate-300 transition hover:-translate-y-0.5 hover:bg-white/10 hover:text-white"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.055] px-3 py-2.5 transition focus-within:border-cyan-300/40 focus-within:bg-white/[0.08]">
            <Search className="h-4 w-4 text-slate-400" />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search people to call..."
              className="w-full bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none"
            />
          </div>

          <div className="mt-4 rounded-2xl border border-cyan-300/15 bg-cyan-300/10 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-300/15 text-cyan-100">
                <Sparkles className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <p className="font-bold">HD Calls Ready</p>
                <p className="truncate text-xs text-slate-300">
                  Start voice or video calls with online users.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="thin-scrollbar flex-1 space-y-2 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="flex animate-pulse items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-3"
                >
                  <div className="h-14 w-14 rounded-full bg-white/10" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/2 rounded bg-white/10" />
                    <div className="h-3 w-1/3 rounded bg-white/10" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-6 text-center">
              <UserRound className="mx-auto mb-3 h-8 w-8 text-slate-400" />
              <p className="font-semibold text-white">No users found</p>
              <p className="mt-1 text-sm text-slate-400">
                Try another name or refresh your users list.
              </p>
            </div>
          ) : (
            filteredUsers.map((user) => {
              const isSelected = selected?._id === user._id;
              const isOnline = Boolean(user?.status);

              return (
                <div
                  onClick={() => setSelected(user)}
                  key={user._id || user.username}
                  className={`group flex cursor-pointer items-center gap-3 rounded-2xl border p-3 transition hover:-translate-y-0.5 hover:bg-white/[0.06] ${
                    isSelected
                      ? "border-cyan-300/40 bg-cyan-300/[0.12] shadow-lg shadow-cyan-950/20"
                      : "border-white/5 bg-white/[0.025]"
                  }`}
                >
                  <div className="relative">
                    <div className="relative h-14 w-14 overflow-hidden rounded-2xl ring-1 ring-white/10">
                      <Image
                        src={user?.avatar || "/avatar.jpg"}
                        alt={user?.username || "User"}
                        fill
                        className="object-cover transition group-hover:scale-105"
                        sizes="56px"
                      />
                    </div>

                    <span
                      className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#07111c] ${
                        isOnline ? "bg-emerald-500" : "bg-slate-500"
                      }`}
                      title={isOnline ? "Online" : "Offline"}
                    >
                      {isOnline && <Wifi className="h-2.5 w-2.5 text-white" />}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <h4 className="truncate font-bold">
                        {user?.username || "Unknown User"}
                      </h4>

                      {user?.verified && (
                        <BadgeCheck className="h-4 w-4 shrink-0 text-sky-400" />
                      )}
                    </div>

                    <div className="mt-1 flex items-center gap-2 text-xs">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          isOnline ? "bg-emerald-400" : "bg-slate-500"
                        }`}
                      />
                      <span className="text-slate-400">
                        {isOnline ? "Available now" : "Offline"}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        startCall(user, "audio");
                      }}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-200 transition hover:-translate-y-0.5 hover:bg-emerald-400/20"
                      title="Voice call"
                    >
                      <Phone className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        startCall(user, "video");
                      }}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100 transition hover:-translate-y-0.5 hover:bg-cyan-300/20"
                      title="Video call"
                    >
                      <Video className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-white/10 p-4">
          <button
            onClick={() => selected && startCall(selected, "video")}
            disabled={!selected}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-4 py-3 font-bold text-slate-950 shadow-lg shadow-cyan-950/20 transition hover:-translate-y-0.5 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-5 w-5" />
            <span>Start New Call</span>
          </button>
        </div>
      </aside>

      <main className="relative hidden min-h-screen overflow-hidden md:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.16),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.12),transparent_35%)]" />

        <div className="relative z-10 flex h-full items-center justify-center p-8">
          <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-white shadow-2xl backdrop-blur">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-cyan-300/15 text-cyan-100">
              {selected ? (
                <Image
                  src={selected?.avatar || "/avatar.jpg"}
                  alt={selected?.username || "Selected user"}
                  width={80}
                  height={80}
                  className="h-20 w-20 rounded-3xl object-cover"
                />
              ) : (
                <ShieldCheck className="h-9 w-9" />
              )}
            </div>

            <h1 className="text-2xl font-black">
              {selected ? selected.username : "Secure EgChat Calls"}
            </h1>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-300">
              {selected
                ? `Choose voice or video to start a call with ${selected.username}.`
                : "Select someone from the list to start a clean voice or video call experience."}
            </p>

            {selected && (
              <div className="mt-6 flex justify-center gap-3">
                <button
                  onClick={() => startCall(selected, "audio")}
                  className="flex items-center gap-2 rounded-2xl bg-emerald-400 px-5 py-3 font-bold text-slate-950 transition hover:-translate-y-0.5 hover:bg-emerald-300"
                >
                  <Phone className="h-5 w-5" />
                  Voice Call
                </button>

                <button
                  onClick={() => startCall(selected, "video")}
                  className="flex items-center gap-2 rounded-2xl bg-cyan-300 px-5 py-3 font-bold text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-200"
                >
                  <Video className="h-5 w-5" />
                  Video Call
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      <CallModal
        open={callOpen}
        onClose={closeCall}
        socket={socket}
        currentUser={currentUser}
        selectedUser={selected}
        incomingCall={incomingCall}
        callType={callType}
      />
    </div>
  );
}