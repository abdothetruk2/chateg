"use client";

import {
  Bot,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Languages,
  ListTodo,
  MessageSquareText,
  Puzzle,
  Sparkles,
} from "lucide-react";
import Sidebar from "../components/Sidebar";

const taskCards = [
  {
    title: "Follow up with recruiter",
    status: "Today",
    body: "Send GitHub link, deployed URL, and short feature summary after the demo.",
  },
  {
    title: "Review room call QA",
    status: "In progress",
    body: "Test direct calls and group room calls with two browser sessions.",
  },
  {
    title: "Polish AI prompts",
    status: "Next",
    body: "Tune summaries, suggested replies, translation, and code explanation prompts.",
  },
];

const extensions = [
  {
    title: "AI Actions",
    icon: Bot,
    copy: "Summarize chats, suggest replies, translate messages, and explain code.",
  },
  {
    title: "Tasks",
    icon: ListTodo,
    copy: "Turn chat decisions into lightweight follow-up cards for teams.",
  },
  {
    title: "Smart Translation",
    icon: Languages,
    copy: "Help mixed-language conversations stay readable during fast chats.",
  },
  {
    title: "Meeting Notes",
    icon: ClipboardList,
    copy: "Capture call outcomes and action items beside room conversations.",
  },
];

export default function ExtensionsPage() {
  return (
    <div className="app-shell grid min-h-screen grid-cols-1 pb-14 text-white lg:grid-cols-[4.5rem_1fr] lg:pb-0">
      <Sidebar />

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="app-page-header flex-col items-start md:flex-row md:items-end">
          <div>
            <div className="app-kicker">
              <Puzzle className="h-4 w-4" />
              Extensions
            </div>
            <h1 className="app-page-title app-gradient-text">Product Add-ons</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              A recruiter-friendly preview of how Egchat can grow beyond chat:
              tasks, AI actions, translation, and call notes.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm font-bold text-emerald-100">
            Portfolio roadmap ready
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {extensions.map((item) => {
            const Icon = item.icon;

            return (
              <article
                key={item.title}
                className="app-premium-card rounded-[1.75rem] p-5"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-cyan-300/15 text-cyan-100">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="font-black">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {item.copy}
                </p>
              </article>
            );
          })}
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="app-premium-card rounded-[1.75rem] p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[1.5px] text-cyan-200">
                  Tasks extension
                </p>
                <h2 className="mt-1 text-xl font-black">Action board</h2>
              </div>
              <CalendarDays className="h-6 w-6 text-cyan-200" />
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {taskCards.map((task) => (
                <article
                  key={task.title}
                  className="app-surface-muted rounded-[1.5rem] p-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="rounded-lg bg-white/10 px-2 py-1 text-xs font-bold text-slate-200">
                      {task.status}
                    </span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-200" />
                  </div>
                  <h3 className="font-bold">{task.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {task.body}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <aside className="app-premium-card rounded-[1.75rem] p-5">
            <Sparkles className="mb-4 h-7 w-7 text-cyan-100" />
            <h2 className="text-xl font-black">AI task capture</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              The intended workflow: ask AI to read a chat, extract decisions,
              and create tasks with owners and due dates. The UI is ready for
              the next backend integration.
            </p>
            <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
              <MessageSquareText className="mb-3 h-5 w-5 text-cyan-200" />
              <p className="text-sm leading-6 text-slate-200">
                “Summarize this room and create follow-up tasks for the team.”
              </p>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
