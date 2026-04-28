"use client";

import { useMemo, useState } from "react";
import {
  Bell,
  BellRing,
  ChevronRight,
  CircleHelp,
  Database,
  Download,
  Eye,
  FileText,
  HardDrive,
  HelpCircle,
  LifeBuoy,
  Lock,
  Mail,
  MessageCircle,
  MonitorSmartphone,
  Search,
  Shield,
  ShieldCheck,
  Trash2,
  Users,
  Volume2,
} from "lucide-react";

const pageConfig = {
  notifications: {
    eyebrow: "Settings",
    title: "Notifications",
    description: "Choose how EgChat gets your attention across messages, calls, and status activity.",
    icon: Bell,
    accent: "text-violet-300",
    sections: [
      {
        title: "Message alerts",
        items: [
          {
            id: "messageSounds",
            icon: BellRing,
            title: "Message sounds",
            description: "Play a sound when new messages arrive.",
            enabled: true,
          },
          {
            id: "desktopPreview",
            icon: MonitorSmartphone,
            title: "Desktop previews",
            description: "Show sender and message previews in notifications.",
            enabled: true,
          },
          {
            id: "groupMentions",
            icon: Users,
            title: "Group mentions",
            description: "Notify only when someone mentions you in a busy group.",
            enabled: false,
          },
        ],
      },
      {
        title: "Status and calls",
        items: [
          {
            id: "statusReplies",
            icon: MessageCircle,
            title: "Status replies",
            description: "Notify when someone replies to your status.",
            enabled: true,
          },
          {
            id: "callRingtone",
            icon: Volume2,
            title: "Call ringtone",
            description: "Ring for incoming voice and video calls.",
            enabled: true,
          },
        ],
      },
    ],
  },
  privacy: {
    eyebrow: "Settings",
    title: "Privacy",
    description: "Control profile visibility, read receipts, and who can reach you.",
    icon: Lock,
    accent: "text-cyan-300",
    sections: [
      {
        title: "Visibility",
        items: [
          {
            id: "lastSeen",
            icon: Eye,
            title: "Last seen and online",
            description: "Let contacts see when you were last active.",
            enabled: true,
          },
          {
            id: "profilePhoto",
            icon: Users,
            title: "Profile photo",
            description: "Show your avatar to people who have your account.",
            enabled: true,
          },
          {
            id: "statusPrivacy",
            icon: Shield,
            title: "Status privacy",
            description: "Only contacts can view your status updates.",
            enabled: true,
          },
        ],
      },
      {
        title: "Message privacy",
        items: [
          {
            id: "readReceipts",
            icon: ShieldCheck,
            title: "Read receipts",
            description: "Show when you have read direct messages.",
            enabled: true,
          },
          {
            id: "unknownSenders",
            icon: Mail,
            title: "Filter unknown senders",
            description: "Move messages from unknown people into requests.",
            enabled: false,
          },
        ],
      },
    ],
  },
  storage: {
    eyebrow: "Settings",
    title: "Storage",
    description: "Review local media usage and choose what EgChat keeps on this device.",
    icon: Database,
    accent: "text-cyan-300",
    storage: true,
    sections: [
      {
        title: "Auto-download",
        items: [
          {
            id: "photos",
            icon: Download,
            title: "Photos",
            description: "Automatically download images on Wi-Fi.",
            enabled: true,
          },
          {
            id: "videos",
            icon: FileText,
            title: "Videos and files",
            description: "Download larger media only when you open it.",
            enabled: false,
          },
        ],
      },
      {
        title: "Cleanup",
        items: [
          {
            id: "autoCleanup",
            icon: Trash2,
            title: "Auto cleanup",
            description: "Remove cached media older than 30 days.",
            enabled: false,
          },
        ],
      },
    ],
  },
  help: {
    eyebrow: "Settings",
    title: "Help",
    description: "Find answers, contact support, and learn the fastest way around EgChat.",
    icon: CircleHelp,
    accent: "text-amber-300",
    help: true,
    links: [
      {
        icon: HelpCircle,
        title: "Help center",
        description: "Browse common setup and messaging questions.",
      },
      {
        icon: LifeBuoy,
        title: "Contact support",
        description: "Send diagnostics and describe the issue.",
      },
      {
        icon: FileText,
        title: "Terms and privacy",
        description: "Review app policies and account safety guidance.",
      },
    ],
  },
};

function Toggle({ enabled, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative h-7 w-12 rounded-full transition ${
        enabled ? "bg-cyan-400" : "bg-white/15"
      }`}
      aria-pressed={enabled}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
          enabled ? "left-6" : "left-1"
        }`}
      />
    </button>
  );
}

function SettingItem({ item, enabled, onToggle }) {
  const Icon = item.icon;

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-black/15 p-4 transition hover:bg-white/[0.04]">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/10 text-cyan-300">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-white">{item.title}</p>
          <p className="mt-1 text-sm text-slate-400">{item.description}</p>
        </div>
      </div>
      <Toggle enabled={enabled} onChange={onToggle} />
    </div>
  );
}

export default function SettingsDetailPage({ type }) {
  const config = pageConfig[type] || pageConfig.notifications;
  const Icon = config.icon;

  const initialToggles = useMemo(() => {
    const values = {};
    for (const section of config.sections || []) {
      for (const item of section.items) {
        values[item.id] = item.enabled;
      }
    }
    return values;
  }, [config]);

  const [toggles, setToggles] = useState(initialToggles);

  function toggleItem(id) {
    setToggles((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  return (
    <div className="mx-auto w-full max-w-5xl pb-24">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#07111c]/95 px-6 py-5 backdrop-blur-md lg:px-10">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-400">
          <span>{config.eyebrow}</span>
          <ChevronRight className="h-4 w-4" />
          <span className="text-white">{config.title}</span>
        </div>
        <div className="mt-4 flex items-start gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-lg bg-white/10 ${config.accent}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              {config.title}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-400">
              {config.description}
            </p>
          </div>
        </div>
      </header>

      <div className="space-y-8 px-6 py-8 lg:px-10">
        {config.storage && (
          <section className="rounded-lg border border-white/10 bg-white/[0.045] p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-[2px] text-cyan-300">
                  Local storage
                </p>
                <h3 className="mt-2 text-3xl font-black text-white">1.2 GB</h3>
                <p className="mt-1 text-sm text-slate-400">of 5.0 GB used</p>
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">
                <HardDrive className="h-8 w-8" />
              </div>
            </div>
            <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-[24%] bg-cyan-400" />
            </div>
            <div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
              <div className="rounded-lg bg-black/15 p-3">Photos: 420 MB</div>
              <div className="rounded-lg bg-black/15 p-3">Videos: 610 MB</div>
              <div className="rounded-lg bg-black/15 p-3">Files: 170 MB</div>
            </div>
          </section>
        )}

        {config.help && (
          <section className="rounded-lg border border-white/10 bg-white/[0.045] p-6">
            <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/20 px-4 py-3">
              <Search className="h-5 w-5 text-slate-400" />
              <input
                type="search"
                placeholder="Search help articles"
                className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
              />
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {config.links.map((link) => {
                const LinkIcon = link.icon;
                return (
                  <button
                    key={link.title}
                    type="button"
                    className="rounded-lg border border-white/10 bg-black/15 p-5 text-left transition hover:bg-white/[0.04]"
                  >
                    <LinkIcon className="h-6 w-6 text-amber-300" />
                    <p className="mt-4 font-bold text-white">{link.title}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {link.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {(config.sections || []).map((section) => (
          <section
            key={section.title}
            className="rounded-lg border border-white/10 bg-white/[0.045] p-6 shadow-sm"
          >
            <h3 className="mb-5 text-lg font-bold text-white">{section.title}</h3>
            <div className="space-y-3">
              {section.items.map((item) => (
                <SettingItem
                  key={item.id}
                  item={item}
                  enabled={Boolean(toggles[item.id])}
                  onToggle={() => toggleItem(item.id)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
