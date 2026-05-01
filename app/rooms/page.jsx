"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import {
  BadgeCheck,
  Hash,
  MessageSquareText,
  Search,
  ShieldCheck,
  Users,
  Video,
} from "lucide-react";
import Sidebar from "../components/Sidebar";

function getCurrentUser() {
  try {
    const rawUser = Cookies.get("user");
    if (!rawUser) return null;
    const parsed = JSON.parse(rawUser);
    return Array.isArray(parsed) ? parsed[0] : parsed;
  } catch {
    return null;
  }
}

function RoomSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <div key={item} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <div className="mb-4 h-32 animate-pulse rounded-lg bg-white/10" />
          <div className="mb-2 h-4 w-2/3 animate-pulse rounded bg-white/10" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-white/10" />
        </div>
      ))}
    </div>
  );
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const currentUser = getCurrentUser();

  useEffect(() => {
    async function loadRooms() {
      try {
        setLoading(true);
        const res = await axios.get("/api/groups");
        setRooms(Array.isArray(res.data) ? res.data : []);
      } catch (error) {
        console.error("Rooms fetch failed:", error);
        setRooms([]);
      } finally {
        setLoading(false);
      }
    }

    loadRooms();
  }, []);

  const filteredRooms = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rooms.filter((room) =>
      (room?.name || "").toLowerCase().includes(query)
    );
  }, [rooms, search]);

  return (
    <div className="app-shell grid min-h-screen grid-cols-1 pb-14 text-white lg:grid-cols-[4.5rem_1fr] lg:pb-0">
      <Sidebar />

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[2px] text-cyan-200">
              <Hash className="h-4 w-4" />
              Rooms
            </div>
            <h1 className="text-3xl font-black">Group Rooms</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Persistent spaces for group chat, members, shared media, and room calls.
            </p>
          </div>

          <div className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-white/10 bg-white/[0.055] px-3 md:max-w-sm">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search rooms..."
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-400"
            />
          </div>
        </header>

        {loading ? (
          <RoomSkeleton />
        ) : filteredRooms.length === 0 ? (
          <div className="app-panel-muted rounded-lg p-8 text-center text-slate-300">
            No rooms found.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredRooms.map((room) => {
              const memberCount = room?.members?.length || 0;
              const isMember = (room?.members || []).some(
                (member) => String(member?._id || member) === String(currentUser?._id)
              );
              const adminName = room?.admin?.username || "Admin";

              return (
                <article
                  key={room._id}
                  className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.045]"
                >
                  <div className="relative h-36 bg-black/25">
                    {room?.avatar ? (
                      <Image
                        src={room.avatar}
                        alt={`${room.name} room`}
                        fill
                        sizes="(max-width: 768px) 92vw, 360px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center bg-[linear-gradient(135deg,rgba(34,211,238,0.18),rgba(15,23,42,0.78),rgba(244,114,182,0.16))]">
                        <Hash className="h-12 w-12 text-cyan-100" />
                      </div>
                    )}
                    <div className="absolute left-3 top-3 rounded-lg border border-white/10 bg-black/35 px-2 py-1 text-xs font-bold text-white backdrop-blur">
                      {isMember ? "Joined" : "Open"}
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="flex items-center gap-2 truncate text-lg font-black">
                          <span className="truncate">{room.name}</span>
                          {isMember && <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-200" />}
                        </h2>
                        <p className="mt-1 truncate text-xs text-slate-400">
                          Managed by {adminName}
                        </p>
                      </div>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-300/15 text-cyan-100">
                        <Users className="h-5 w-5" />
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-bold text-slate-300">
                      <div className="rounded-lg bg-white/5 px-2 py-3">
                        <Users className="mx-auto mb-1 h-4 w-4 text-cyan-200" />
                        {memberCount}
                      </div>
                      <div className="rounded-lg bg-white/5 px-2 py-3">
                        <MessageSquareText className="mx-auto mb-1 h-4 w-4 text-emerald-200" />
                        Chat
                      </div>
                      <div className="rounded-lg bg-white/5 px-2 py-3">
                        <Video className="mx-auto mb-1 h-4 w-4 text-amber-200" />
                        Call
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2 text-xs text-slate-400">
                        <ShieldCheck className="h-4 w-4 shrink-0 text-cyan-200" />
                        <span className="truncate">Admin approvals enabled</span>
                      </div>
                      <Link
                        href="/chat"
                        className="rounded-lg bg-cyan-300 px-3 py-2 text-xs font-black text-slate-950 transition hover:bg-cyan-200"
                      >
                        Open
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
