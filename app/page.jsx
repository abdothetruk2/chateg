import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Code2,
  MessageSquareText,
  PhoneCall,
  ShieldCheck,
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
];

export const metadata = {
  title: "Egchat | Realtime Chat, Groups, Calls, and Social Profiles",
  description:
    "Egchat is a full-stack realtime messaging app with rooms, groups, media sharing, stories, posts, profile covers, and WebRTC calls.",
  alternates: {
    canonical: "/",
  },
};

export default function LandingPage() {
  return (
    <div className="app-shell min-h-screen text-white">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 text-sm font-black text-cyan-100">
            Eg
          </span>
          <span className="text-lg font-black">Egchat</span>
        </Link>

        <nav className="flex items-center gap-2">
          <Link
            href="https://github.com/abdothetruk2/chateg"
            target="_blank"
            rel="noreferrer"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-200 transition hover:bg-white/10"
            aria-label="Open GitHub repository"
          >
            <Code2 className="h-5 w-5" />
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-white/10 px-4 py-2 text-sm font-bold text-slate-200 transition hover:bg-white/10"
          >
            Login
          </Link>
          <Link
            href="/chat"
            className="hidden rounded-lg bg-cyan-300 px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-cyan-200 sm:inline-flex"
          >
            Open App
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid min-h-[calc(100vh-92px)] w-full max-w-7xl items-center gap-10 px-4 pb-14 pt-6 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-xs font-bold uppercase tracking-[1.5px] text-emerald-100">
              <Sparkles className="h-4 w-4" />
              Portfolio ready realtime app
            </div>
            <h1 className="text-5xl font-black leading-tight tracking-normal sm:text-6xl">
              Egchat
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
              A full-stack messaging product with live chat, rooms, group
              moderation, posts, stories, media uploads, profile covers, and
              browser calls.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login?demo=1"
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-200"
              >
                Try Demo
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="https://github.com/abdothetruk2/chateg"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/10"
              >
                <Code2 className="h-4 w-4" />
                GitHub
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-lg border border-white/10 bg-[#07111c] shadow-2xl shadow-black/40">
              <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.045] px-4 py-3">
                <span className="h-3 w-3 rounded-full bg-red-400" />
                <span className="h-3 w-3 rounded-full bg-amber-300" />
                <span className="h-3 w-3 rounded-full bg-emerald-400" />
                <span className="ml-3 text-xs font-bold uppercase tracking-[1.5px] text-slate-400">
                  live workspace
                </span>
              </div>
              <div className="grid gap-4 p-4 md:grid-cols-[0.82fr_1.18fr]">
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.045] p-3"
                    >
                      <div className="h-11 w-11 rounded-full bg-cyan-300/20" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="h-3 w-2/3 rounded bg-white/15" />
                        <div className="h-2.5 w-1/2 rounded bg-white/10" />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex min-h-[360px] flex-col rounded-lg border border-white/10 bg-black/20 p-4">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="relative h-12 w-12 overflow-hidden rounded-full">
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
                  <div className="space-y-4">
                    <div className="max-w-[78%] rounded-lg rounded-bl-sm bg-white/10 px-4 py-3 text-sm text-slate-100">
                      Can I review the code and feature scope?
                    </div>
                    <div className="ml-auto max-w-[78%] rounded-lg rounded-br-sm bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950">
                      Yes. Demo login, GitHub, and project notes are ready.
                    </div>
                  </div>
                  <div className="mt-auto flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-3">
                    <div className="h-3 flex-1 rounded bg-white/10" />
                    <div className="h-9 w-9 rounded-lg bg-cyan-300" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-white/[0.025] px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-4">
            {[
              ["Messages", MessageSquareText, "Realtime delivery, read state, reactions, media, and voice notes."],
              ["Rooms", UsersRound, "Group spaces with membership requests, admins, and shared files."],
              ["Calls", PhoneCall, "WebRTC voice/video calls with room call entry points."],
              ["Security", ShieldCheck, "Protected API surface and hashed passwords for new users."],
            ].map(([title, Icon, copy]) => (
              <div key={title} className="rounded-lg border border-white/10 bg-white/[0.045] p-5">
                <Icon className="mb-4 h-6 w-6 text-cyan-200" />
                <h2 className="font-black">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">{copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="project-info" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[2px] text-amber-200">
                Project Info
              </p>
              <h2 className="mt-3 text-3xl font-black">Built for recruiter review</h2>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                Egchat demonstrates realtime systems, product UI, file handling,
                auth hardening, and database modeling in one deployable app.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {stack.map((item) => (
                  <span
                    key={item}
                    className="rounded-lg border border-white/10 bg-white/[0.045] px-3 py-2 text-xs font-bold text-slate-200"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {screenshots.map((shot) => (
                <a
                  key={shot.src}
                  href={shot.src}
                  target="_blank"
                  rel="noreferrer"
                  className="group overflow-hidden rounded-lg border border-white/10 bg-white/[0.045]"
                >
                  <div className="relative aspect-[4/3] bg-black/25">
                    <Image
                      src={shot.src}
                      alt={`${shot.title} screenshot`}
                      fill
                      sizes="(max-width: 768px) 92vw, 360px"
                      className="object-cover transition group-hover:scale-105"
                    />
                  </div>
                  <div className="flex items-center justify-between px-3 py-3 text-sm font-bold">
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
