"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import {
  CircleAlert,
  Hash,
  Loader2,
  ListTodo,
  LogOut,
  Puzzle,
  MessageSquare,
  Newspaper,
  Phone,
  Settings,
  Users,
} from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "../../lib/utils";
import Cookies from "js-cookie";
import { clearUser } from "../../features/user/userSlice";
import { socket } from "../socket";
const items = [
  { name: "Posts", icon: Newspaper, href: "/post" },
  { name: "Messages", icon: MessageSquare, href: "/chat" },
  { name: "Rooms", icon: Hash, href: "/rooms" },
  { name: "Tasks", icon: ListTodo, href: "/todo" },
  { name: "Contacts", icon: Users, href: "/friends" },
  { name: "Calls", icon: Phone, href: "/calls" },
  { name: "Status", icon: CircleAlert, href: "/status" },
  { name: "Extensions", icon: Puzzle, href: "/extensions" },
  { name: "Settings", icon: Settings, href: "/settings" },
];

function getCookieUser() {
  try {
    const cookieUser = Cookies.get("user");
    if (!cookieUser) return null;

    const parsedUser = JSON.parse(cookieUser);
    return Array.isArray(parsedUser) ? parsedUser[0] : parsedUser;
  } catch {
    return null;
  }
}

function getProfileName(user) {
  return (
    user?.username ||
    user?.developerName ||
    String(user?.email || "").split("@")[0] ||
    "Profile"
  );
}

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useDispatch();
  const reduxUser = useSelector((state) => state.user.user);
  const [pendingHref, setPendingHref] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const profileUser = reduxUser?._id ? reduxUser : currentUser;
  const profileAvatar = profileUser?.avatar || "/avatar.jpg";
  const profileName = getProfileName(profileUser);

  useEffect(() => {
    const cookieUser = getCookieUser();

    if (!cookieUser?._id) {
      router.push("/login");
      return;
    }

    setCurrentUser(cookieUser);
  }, [router]);

  useEffect(() => {
    if (reduxUser?._id) {
      setCurrentUser(reduxUser);
    }
  }, [reduxUser]);

  async function handleLogout() {
    if (isLoggingOut) return;

    try {
      setIsLoggingOut(true);
      await axios.post("/api/logout");
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      Cookies.remove("user", { path: "/" });
      dispatch(clearUser());
      if (socket.connected) socket.disconnect();
      router.replace("/login");
      router.refresh();
      setIsLoggingOut(false);
    }
  }

  return (
    <aside className="app-sidebar app-panel fixed inset-x-0 bottom-0 z-40 flex h-[calc(4rem_+_env(safe-area-inset-bottom))] items-center justify-start gap-1 overflow-x-auto rounded-t-[1.5rem] border-t border-white/10 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-24px_44px_rgba(0,0,0,0.35)] backdrop-blur-2xl sm:rounded-t-[1.75rem] lg:sticky lg:top-0 lg:h-screen lg:w-[72px] lg:flex-col lg:justify-start lg:gap-2 lg:overflow-visible lg:rounded-none lg:border-r lg:border-t-0 lg:px-2 lg:py-4 lg:pb-4 lg:shadow-[inset_-1px_0_0_rgba(255,255,255,0.04),14px_0_42px_rgba(0,0,0,0.28)]">
      <Link
        href="/"
        className="mb-3 hidden h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-300/12 text-sm font-black text-cyan-100 shadow-lg shadow-cyan-950/20 transition hover:-translate-y-0.5 hover:border-cyan-300/45 hover:bg-cyan-300/18 lg:flex"
      >
        Eg
      </Link>

      <div className="hidden h-px w-9 bg-white/10 lg:block" />

      {items.map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const isPending = pendingHref === item.href && pathname !== item.href;

        return (
          <Link
            key={item.name}
            href={item.href}
            className="group relative shrink-0"
            onClick={() => {
              if (item.href !== pathname) setPendingHref(item.href);
            }}
            aria-current={active ? "page" : undefined}
          >
            <Button
              variant="ghost"
              title={item.name}
              aria-label={item.name}
              className={cn(
                "relative flex h-11 min-w-11 items-center justify-center gap-2 rounded-2xl border px-3 transition-all duration-200 sm:h-12 lg:h-11 lg:w-11 lg:min-w-0 lg:px-0",
                active
                  ? "border-cyan-300/35 bg-cyan-300/15 text-cyan-100 shadow-lg shadow-cyan-950/30"
                  : "border-transparent bg-transparent text-slate-400 hover:-translate-y-0.5 hover:border-white/10 hover:bg-white/[0.08] hover:text-white"
              )}
            >
              {active && (
                <>
                  <span className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_top,rgba(103,232,249,0.18),transparent_72%)]" />
                  <span className="absolute -left-2 hidden h-6 w-1 rounded-r-full bg-cyan-300 lg:block" />
                </>
              )}
              {isPending ? (
                <Loader2 className="sidebar-load-ring relative z-10" size={21} />
              ) : (
                <Icon className="relative z-10" size={22} />
              )}
              <span
                className={cn(
                  "relative z-10 hidden text-xs font-black lg:hidden",
                  active && "sm:inline"
                )}
              >
                {item.name}
              </span>
            </Button>

            <span className="pointer-events-none absolute left-[calc(100%_+_0.75rem)] top-1/2 hidden -translate-y-1/2 rounded-xl border border-white/10 bg-slate-950/90 px-3 py-2 text-xs font-bold text-slate-100 opacity-0 shadow-xl transition group-hover:opacity-100 lg:block">
              {item.name}
            </span>
          </Link>
        );
      })}
      <div className="group relative shrink-0">
        <Button
          variant="ghost"
          type="button"
          title="Logout"
          aria-label="Logout"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="relative flex h-11 min-w-11 items-center justify-center gap-2 rounded-2xl border border-transparent bg-transparent px-3 text-slate-400 transition-all duration-200 hover:-translate-y-0.5 hover:border-red-300/20 hover:bg-red-500/10 hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-60 sm:h-12 lg:h-11 lg:w-11 lg:min-w-0 lg:px-0"
        >
          {isLoggingOut ? (
            <Loader2 className="sidebar-load-ring relative z-10" size={21} />
          ) : (
            <LogOut className="relative z-10" size={22} />
          )}
          <span className="relative z-10 hidden text-xs font-black text-red-100 sm:inline lg:hidden">
            Logout
          </span>
        </Button>

        <span className="pointer-events-none absolute left-[calc(100%_+_0.75rem)] top-1/2 hidden -translate-y-1/2 rounded-xl border border-white/10 bg-slate-950/90 px-3 py-2 text-xs font-bold text-slate-100 opacity-0 shadow-xl transition group-hover:opacity-100 lg:block">
          Logout
        </span>
      </div>
      <Link
        href="/settings"
        className="group/profile flex h-11 min-w-[5.75rem] shrink-0 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-2 text-center transition hover:-translate-y-0.5 hover:border-cyan-300/25 hover:bg-cyan-300/10 sm:h-12 sm:min-w-[7rem] lg:mt-auto lg:h-auto lg:w-full lg:min-w-0 lg:flex-col lg:px-1.5 lg:py-2"
        title={profileName}
        aria-label={profileName}
      >
        <span className="relative block h-8 w-8 shrink-0 overflow-hidden rounded-2xl border border-cyan-300/25 bg-slate-900 shadow-lg shadow-cyan-950/20 lg:h-10 lg:w-10">
          <Image
            src={profileAvatar}
            alt={`${profileName} avatar`}
            fill
            sizes="(min-width: 1024px) 40px, 32px"
            className="object-cover"
          />
        </span>
        <span className="max-w-[4.5rem] truncate text-[10px] font-black text-cyan-100 sm:max-w-[5.75rem] lg:w-full">
          {profileName}
        </span>
      </Link>
    </aside>
  );
}
