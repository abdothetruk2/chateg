"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bot,
  CircleAlert,
  Hash,
  Loader2,
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
const items = [
  { name: "Posts", icon: Newspaper, href: "/posts" },
  { name: "Messages", icon: MessageSquare, href: "/chat" },
  { name: "Rooms", icon: Hash, href: "/rooms" },
  { name: "Contacts", icon: Users, href: "/friends" },
  { name: "Calls", icon: Phone, href: "/calls" },
  { name: "Status", icon: CircleAlert, href: "/status" },
  { name: "Extensions", icon: Puzzle, href: "/extensions" },
  { name: "Settings", icon: Settings, href: "/settings" },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState("");

  useEffect(() => {
    if (!Cookies.get("user")) {
      router.push("/login");
    }
  }, [router]);

  return (
    <aside className="app-panel fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-start gap-1 overflow-x-auto rounded-t-[1.75rem] border-t border-white/10 px-2 shadow-[0_-24px_44px_rgba(0,0,0,0.35)] backdrop-blur-2xl lg:sticky lg:top-0 lg:h-screen lg:w-[72px] lg:flex-col lg:justify-start lg:gap-2 lg:overflow-visible lg:rounded-none lg:border-r lg:border-t-0 lg:px-2 lg:py-4 lg:shadow-[inset_-1px_0_0_rgba(255,255,255,0.04),14px_0_42px_rgba(0,0,0,0.28)]">
      <Link
        href="/"
        className="mb-3 hidden h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/12 text-sm font-black text-cyan-100 shadow-lg shadow-cyan-950/20 transition hover:-translate-y-0.5 hover:border-cyan-300/40 hover:bg-cyan-300/18 lg:flex"
      >
        Eg
      </Link>
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
                "relative flex h-11 w-11 items-center justify-center rounded-2xl border transition-all duration-200 sm:h-12 sm:w-12 lg:h-11 lg:w-11",
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
            </Button>

          <span className="pointer-events-none absolute left-[calc(100%+0.75rem)] top-1/2 hidden -translate-y-1/2 rounded-xl border border-white/10 bg-slate-950/90 px-3 py-2 text-xs font-bold text-slate-100 opacity-0 shadow-xl transition group-hover:opacity-100 lg:block">
            {item.name}
          </span>
        </Link>
        );
      })}
      <div className="mt-auto hidden w-full pb-1 text-center text-[10px] font-bold uppercase leading-4 tracking-[0.24em] text-slate-500 lg:block">
        <span className="block text-cyan-200">Live</span>
        <span>Chat</span>
        <span className="block">Suite</span>
      </div>
    </aside>
  );
}
