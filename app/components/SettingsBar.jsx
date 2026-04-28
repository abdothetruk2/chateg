"use client";

import {
  UserPen,
  Bell,
  Lock,
  Database,
  CircleQuestionMark,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const settingsLinks = [
  {
    name: "Profile",
    href: "/settings",
    icon: UserPen,
  },
  {
    name: "Notifications",
    href: "/settings/notifications",
    icon: Bell,
  },
  {
    name: "Privacy",
    href: "/settings/privacy",
    icon: Lock,
  },
  {
    name: "Storage",
    href: "/settings/storage",
    icon: Database,
  },
  {
    name: "Help",
    href: "/settings/help",
    icon: CircleQuestionMark,
  },
];
    
export default function SettingsBar() {
  const pathname = usePathname();

  return (
    <aside className="app-panel w-full border-b p-4 text-white lg:h-screen lg:border-b-0 lg:p-5">
      <div className="mb-4 border-b border-white/10 pb-4 lg:mb-6">
        <h1 className="text-xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-slate-400">
          Manage your account preferences
        </p>
      </div>

      <ul className="flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-2 lg:overflow-visible lg:pb-0">
        {settingsLinks.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <li key={item.name} className="shrink-0 lg:shrink">
              <Link
                href={item.href}
                className={`group flex items-center gap-3 whitespace-nowrap rounded-lg border px-4 py-3 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 ${
                  isActive
                    ? "border-cyan-300/30 bg-cyan-300/15 text-cyan-100 shadow-inner"
                    : "border-transparent text-slate-300 hover:border-white/10 hover:bg-white/[0.07] hover:text-white"
                }`}
              >
                <Icon
                  className={`h-5 w-5 transition-transform duration-200 ${
                    isActive
                      ? "text-cyan-200"
                      : "text-slate-400 group-hover:scale-110 group-hover:text-white"
                  }`}
                />
                <span>{item.name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
