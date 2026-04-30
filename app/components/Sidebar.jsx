"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CircleAlert, MessageSquare, Phone, Settings, Users } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "../../lib/utils";
import Cookies from "js-cookie";
const items = [
  { name: "Messages", icon: MessageSquare, href: "/" },
  { name: "Contacts", icon: Users, href: "/friends" },
  { name: "Calls", icon: Phone, href: "/calls" },
  { name: "Status", icon: CircleAlert, href: "/status" },
  { name: "Settings", icon: Settings, href: "/settings" },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!Cookies.get("user")) {
      router.push("/login");
    }
  }, [router]);

  return (
   
   <aside className="fixed inset-x-0 bottom-0 z-40 flex h-14 items-center justify-around border-t border-white/10 bg-[#07111f]/90 px-2 shadow-[0_-16px_38px_rgba(0,0,0,0.32)] backdrop-blur-xl lg:sticky lg:top-0 lg:h-screen lg:w-[72px] lg:flex-col lg:justify-start lg:gap-2 lg:border-r lg:border-t-0 lg:px-2 lg:py-3 lg:shadow-[inset_-1px_0_0_rgba(255,255,255,0.06),10px_0_36px_rgba(0,0,0,0.3)]">
      <Link
        href="/"
        className="mb-2 hidden h-10 w-10 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-300/10 text-sm font-black text-cyan-100 shadow-lg shadow-cyan-950/20 transition hover:border-cyan-300/40 hover:bg-cyan-300/15 lg:flex"
      >
        Eg
      </Link>
      {items.map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href ||
          (item.href !== "/" && pathname.startsWith(item.href));

        return (
          <Link key={item.name} href={item.href} className="shrink-0">
            <Button
              variant="ghost"
              title={item.name}
              aria-label={item.name}
              className={cn(
                "relative flex h-10 w-10 items-center justify-center rounded-lg border transition-all duration-200 sm:h-11 sm:w-11 lg:h-10 lg:w-10",
                active
                  ? "border-cyan-300/35 bg-cyan-300/15 text-cyan-100 shadow-lg shadow-cyan-950/30"
                  : "border-transparent text-slate-400 hover:-translate-y-0.5 hover:border-white/10 hover:bg-white/[0.08] hover:text-white"
              )}
            >
              {active && (
                <span className="absolute -left-2 hidden h-5 w-1 rounded-r-full bg-cyan-300 lg:block" />
              )}
              <Icon size={22} />
            </Button>
          </Link>
        );
      })}
    </aside>
  );
}
