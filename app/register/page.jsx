"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useDispatch } from "react-redux";
import axios from "axios";
import Cookies from "js-cookie";
import {
  ArrowRight,
  Mail,
  ShieldCheck,
  Sparkles,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { setUser } from "../../features/user/userSlice";

export default function RegisterPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [form, setForm] = useState({ username: "", password: "", email: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      setIsSubmitting(true);
      const res = await axios.post("/api/register", form);

      Cookies.set("user", JSON.stringify(res.data.user), {
        expires: 7,
        sameSite: "lax",
      });
      dispatch(setUser(res.data.user));
      setForm({ username: "", password: "", email: "" });
      router.replace("/post");
      router.refresh();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || "Register failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="app-shell flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
      <div className="app-scale-in grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-black/15 shadow-[0_30px_90px_rgba(0,0,0,0.34)] backdrop-blur-2xl lg:grid-cols-[0.94fr_1.06fr]">
        <section className="relative hidden overflow-hidden border-r border-white/10 bg-[linear-gradient(180deg,rgba(4,12,21,0.94),rgba(5,10,18,0.88))] p-8 lg:flex lg:flex-col xl:p-10">
          <div className="app-kicker w-fit">
            <Sparkles className="h-4 w-4" />
            Create account
          </div>

          <div className="mt-8 max-w-md">
            <p className="text-sm font-black tracking-[0.24em] text-cyan-100">
              EGCHAT
            </p>
            <h1 className="mt-4 text-5xl font-black leading-[0.96]">
              Launch a full realtime workspace in one account.
            </h1>
            <p className="mt-5 text-base leading-8 text-slate-300">
              Sign up once to access direct messages, room conversations, status updates, posts, file sharing, and browser-based calls.
            </p>
          </div>

          <div className="mt-8 grid gap-3">
            {[
              ["Profile setup", UserPlus, "Create your identity and land directly in the posts feed."],
              ["Private by default", ShieldCheck, "Keep credentials secure and secrets off the frontend."],
              ["Built for teams", UsersRound, "Move between messages, rooms, posts, and status with one account."],
            ].map(([title, Icon, copy]) => (
              <div key={title} className="app-stat-card rounded-[1.75rem] p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-300/12 text-cyan-100">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-black">{title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-300">{copy}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-auto rounded-[1.75rem] border border-cyan-300/15 bg-cyan-300/10 px-5 py-4 text-sm font-semibold text-cyan-100">
            After signup, you land directly in the app so the onboarding flow stays fast and focused.
          </div>
        </section>

        <section className="app-panel p-6 sm:p-8 lg:p-10">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-300/10 text-sm font-black text-cyan-100">
                  Eg
                </div>
                <div>
                  <p className="text-sm font-black tracking-[0.22em] text-cyan-100">
                    EGCHAT
                  </p>
                  <p className="text-sm text-slate-400">Create your account</p>
                </div>
              </div>

              <Link href="/" className="app-button-ghost hidden px-4 py-3 text-sm sm:inline-flex">
                Home
              </Link>
            </div>

            <div className="mb-6 grid grid-cols-2 rounded-[1.2rem] border border-white/10 bg-white/5 p-1">
              <Link
                href="/login"
                className="rounded-[0.95rem] px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-white/10"
              >
                Log in
              </Link>
              <button className="rounded-[0.95rem] bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950">
                Sign up
              </button>
            </div>

            <div className="mb-6">
              <h2 className="text-3xl font-black text-white">Create account</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Set up your profile and move straight into posts, realtime chat, rooms, and calls.
              </p>
            </div>

            <form className="app-stagger space-y-4" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-200">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={form.email}
                    placeholder="Enter your email"
                    className="app-input w-full rounded-2xl py-3.5 pl-11 pr-4 text-white"
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="username" className="mb-2 block text-sm font-semibold text-slate-200">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  name="username"
                  value={form.username}
                  placeholder="Choose a username"
                  className="app-input w-full rounded-2xl px-4 py-3.5 text-white"
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-200">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  name="password"
                  value={form.password}
                  placeholder="Create a password"
                  className="app-input w-full rounded-2xl px-4 py-3.5 text-white"
                  onChange={handleChange}
                />
              </div>

              {error && (
                <p className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="app-button-primary w-full py-3.5 shadow-[0_18px_38px_rgba(8,145,178,0.28)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Creating..." : "Create account"}
                {!isSubmitting && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
