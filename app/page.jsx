import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BellRing,
  Bot,
  Code2,
  ImagePlus,
  Languages,
  ListTodo,
  MessageSquareText,
  PhoneCall,
  Sparkles,
  UsersRound,
} from "lucide-react";

const screenshots = [
  {
    title: "Realtime chat",
    src: "/media/1777360352662in9pq9akxtmScreenshot%20From%202026-04-27%2023-25-31.png",
  },
  {
    title: "Status stories",
    src: "/story/1777321598648-u3ool46ds1-Screenshot%20From%202026-04-27%2023-25-31.png",
  },
  {
    title: "Group spaces",
    src: "/group/177736172374535kex9bk9e1Screenshot%20From%202026-04-27%2023-25-31.png",
  },
];

const stack = [
  "Next.js App Router",
  "React 19",
  "MongoDB + Mongoose",
  "Socket.IO",
  "WebRTC calls",
  "Tailwind CSS",
  "Node.js",
  "AI API",
];

const features = [
  "Real-time chat",
  "Group chat",
  "Stories/status",
  "Unread messages",
  "Typing indicator",
  "Media uploads",
  "AI assistant",
  "Room calls",
];

const highlights = [
  {
    title: "Realtime Chat",
    icon: MessageSquareText,
    copy: "Realtime delivery, read state, reactions, media, and voice notes.",
  },
  {
    title: "Groups",
    icon: UsersRound,
    copy: "Group spaces with approvals, shared media, and reusable conversation history.",
  },
  {
    title: "Media",
    icon: ImagePlus,
    copy: "Photos, videos, files, and voice notes stay attached to each conversation.",
  },
  {
    title: "Stories",
    icon: Sparkles,
    copy: "Status updates with replies, progress bars, and mobile-friendly viewing.",
  },
  {
    title: "Calls",
    icon: PhoneCall,
    copy: "Voice and video entry points built around active conversations and rooms.",
  },
  {
    title: "Notifications",
    icon: BellRing,
    copy: "Unread badges, message sounds, call ringtone preferences, and visible activity cues.",
  },
];

const assistantCards = [
  {
    title: "Summaries",
    icon: MessageSquareText,
    copy: "Turn long threads into concise updates for busy conversations.",
  },
  {
    title: "Translation",
    icon: Languages,
    copy: "Keep mixed-language chats readable during fast back-and-forth.",
  },
  {
    title: "Tasks",
    icon: ListTodo,
    copy: "Convert decisions into follow-up tasks from the same workspace.",
  },
];

export const metadata = {
  title: "Egchat | Real-time Chat App",
  description:
    "Egchat is a real-time chat app built with Next.js, MongoDB, Socket.io, Tailwind CSS, and AI features.",
  alternates: {
    canonical: "/",
  },
};

export default function LandingPage() {
  return (
    <div className="app-shell min-h-screen text-white">
      <header className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
        <div className="app-surface flex items-center justify-between rounded-[1.75rem] px-4 py-3 sm:px-5">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-300/12 text-sm font-black text-cyan-100">
              Eg
            </span>
            <div>
              <p className="text-sm font-black tracking-[0.24em] text-cyan-100">
                EGCHAT
              </p>
              <p className="text-xs text-slate-400">Realtime portfolio workspace</p>
            </div>
          </Link>

          <nav className="flex items-center gap-2">
            <Link
              href="https://github.com/abdothetruk2/chateg"
              target="_blank"
              rel="noreferrer"
              className="app-button-ghost hidden px-4 py-3 text-sm sm:inline-flex"
            >
              <Code2 className="h-4 w-4" />
              GitHub
            </Link>
            <Link href="/login" className="app-button-secondary px-4 py-3 text-sm">
              Login
            </Link>
            <Link href="/posts" className="app-button-primary hidden px-4 py-3 text-sm sm:inline-flex">
              Open App
              <ArrowRight className="h-4 w-4" />
            </Link>
          </nav>
        </div>
      </header>

      <main className="pb-16">
        <section className="mx-auto grid min-h-[calc(100vh-104px)] w-full max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:py-12">
          <div className="max-w-2xl">
            <div className="app-kicker">
              <Sparkles className="h-4 w-4" />
              Portfolio-ready realtime UI
            </div>

            <h1 className="mt-6 text-5xl font-black leading-[0.94] sm:text-6xl lg:text-7xl">
              Modern chat,
              <span className="block text-cyan-100">status, calls, and social spaces.</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
              Egchat combines messaging, stories, groups, media sharing, and AI-assisted workflows into one polished Next.js workspace.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login?demo=1" className="app-button-primary">
                Try Demo
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/register" className="app-button-secondary">
                Create Account
              </Link>
              <Link href="/login" className="app-button-ghost">
                Continue to Login
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                ["Realtime", "Socket delivery and online presence"],
                ["Media", "Stories, uploads, and social posts"],
                ["Calls", "Voice and video from chats and rooms"],
              ].map(([label, copy]) => (
                <div key={label} className="app-stat-card rounded-3xl p-4">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-100">
                    {label}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{copy}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="app-surface overflow-hidden rounded-[2rem] p-4 shadow-[0_40px_110px_rgba(0,0,0,0.35)] sm:p-5">
              <div className="flex items-center justify-between rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-400" />
                  <span className="h-3 w-3 rounded-full bg-amber-300" />
                  <span className="h-3 w-3 rounded-full bg-emerald-400" />
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                  Live workspace
                </p>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[0.78fr_1.22fr]">
                <div className="space-y-3">
                  {[
                    ["Design sync", "4 members online"],
                    ["Recruiter review", "2 files shared"],
                    ["Status updates", "9 recent stories"],
                    ["AI helper", "Summaries ready"],
                  ].map(([title, copy]) => (
                    <div key={title} className="app-list-item rounded-3xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-300/12 text-cyan-100">
                          <MessageSquareText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-bold">{title}</p>
                          <p className="truncate text-sm text-slate-400">{copy}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(7,14,24,0.94),rgba(2,8,18,0.9))] p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-12 overflow-hidden rounded-2xl ring-1 ring-white/10">
                        <Image
                          src="/avatar.jpg"
                          alt="Egchat profile"
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-bold">Recruiter Room</p>
                        <p className="text-xs text-emerald-200">3 members online</p>
                      </div>
                    </div>
                    <div className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-200">
                      Live now
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="max-w-[78%] rounded-[1.4rem] rounded-bl-md bg-white/8 px-4 py-3 text-sm text-slate-100">
                      Can I review the feature scope, demo flow, and architecture?
                    </div>
                    <div className="ml-auto max-w-[82%] rounded-[1.4rem] rounded-br-md bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950">
                      Yes. Messaging, groups, stories, posts, and call entry points are all ready for walkthrough.
                    </div>
                    <div className="max-w-[74%] rounded-[1.4rem] rounded-bl-md bg-white/8 px-4 py-3 text-sm text-slate-100">
                      Perfect. I also need screenshots and deployment notes.
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {screenshots.map((shot) => (
                      <a
                        key={shot.src}
                        href={shot.src}
                        target="_blank"
                        rel="noreferrer"
                        className="group overflow-hidden rounded-2xl border border-white/10 bg-white/5"
                      >
                        <div className="relative aspect-[4/3]">
                          <Image
                            src={shot.src}
                            alt={shot.title}
                            fill
                            sizes="(max-width: 640px) 100vw, 220px"
                            className="object-cover transition duration-300 group-hover:scale-105"
                          />
                        </div>
                        <div className="px-3 py-2">
                          <p className="truncate text-xs font-bold uppercase tracking-[0.16em] text-slate-300">
                            {shot.title}
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="pointer-events-none absolute -bottom-5 left-8 hidden rounded-3xl border border-amber-300/15 bg-amber-300/10 px-4 py-3 text-sm font-bold text-amber-100 shadow-lg shadow-black/30 md:block">
              AI summaries, calls, status, and social feed in one deployable build.
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
          <div className="app-surface rounded-[2rem] p-6 sm:p-7">
            <Bot className="mb-4 h-7 w-7 text-cyan-100" />
            <h2 className="text-3xl font-black">AI assistant built into the workspace</h2>
            <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">
              Ask AI to summarize busy threads, suggest replies, translate mixed-language conversations, and turn decisions into next actions.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {assistantCards.map((item) => {
              const Icon = item.icon;

              return (
                <article key={item.title} className="app-stat-card rounded-[1.75rem] p-5">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-300/12 text-cyan-100">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-black">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{item.copy}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {highlights.map((item) => {
              const Icon = item.icon;

              return (
                <article key={item.title} className="app-stat-card rounded-[1.75rem] p-5">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/8 text-cyan-100">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-black">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{item.copy}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section id="project-info" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
            <div className="app-surface rounded-[2rem] p-6 sm:p-7">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-200">
                Project Info
              </p>
              <h2 className="mt-3 text-3xl font-black">Built for recruiter review and product demos</h2>
              <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">
                Egchat demonstrates realtime systems, product interface thinking, file handling, auth hardening, and database modeling in one cohesive app.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {stack.map((item) => (
                  <span
                    key={item}
                    className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200"
                  >
                    {item}
                  </span>
                ))}
              </div>

              <div className="mt-6">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Features
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {features.map((item) => (
                    <span
                      key={item}
                      className="rounded-2xl border border-emerald-300/18 bg-emerald-300/10 px-3 py-2 text-xs font-bold text-emerald-100"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {screenshots.map((shot) => (
                <a
                  key={shot.src}
                  href={shot.src}
                  target="_blank"
                  rel="noreferrer"
                  className="group app-stat-card overflow-hidden rounded-[1.75rem]"
                >
                  <div className="relative aspect-[4/3] bg-black/20">
                    <Image
                      src={shot.src}
                      alt={`${shot.title} screenshot`}
                      fill
                      sizes="(max-width: 768px) 92vw, 360px"
                      className="object-cover transition duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="flex items-center justify-between px-4 py-4 text-sm font-bold">
                    <span>{shot.title}</span>
                    <BadgeCheck className="h-4 w-4 text-emerald-200" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
