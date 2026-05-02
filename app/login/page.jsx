"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import axios from "axios";
import {
  ArrowRight,
  Code2,
  MessageSquareText,
  PlayCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDemoSubmitting, setIsDemoSubmitting] = useState(false);

  function storeUser(user) {
    Cookies.set("user", JSON.stringify(user), {
      expires: 14,
      sameSite: "lax",
    });
  }

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      setIsSubmitting(true);
      const res = await axios.post("/api/login", form);

      storeUser(res.data.user);
      setForm({ username: "", password: "" });
      router.replace("/posts");
      router.refresh();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || "Login failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDemoLogin() {
    try {
      setIsDemoSubmitting(true);
      setError("");
      const res = await axios.post("/api/demo-login");

      storeUser(res.data.user);
      router.replace("/posts");
      router.refresh();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Demo login failed."
      );
    } finally {
      setIsDemoSubmitting(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauth = params.get("oauth");

    if (oauth === "google-missing") {
      setError("Google login needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.");
    } else if (oauth === "failed" || oauth === "invalid") {
      setError("Google login could not be completed.");
    }

    if (params.get("demo") === "1") {
      handleDemoLogin();
    }
    // Run only once when the login page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="app-shell flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
      <div className="app-scale-in grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-black/15 shadow-[0_30px_90px_rgba(0,0,0,0.34)] backdrop-blur-2xl lg:grid-cols-[0.94fr_1.06fr]">
        <section className="relative hidden overflow-hidden border-r border-white/10 bg-[linear-gradient(180deg,rgba(6,14,24,0.92),rgba(5,11,19,0.88))] p-8 lg:flex lg:flex-col xl:p-10">
          <div className="app-kicker w-fit">
            <Sparkles className="h-4 w-4" />
            Welcome back
          </div>

          <div className="mt-8 max-w-md">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-100">
              EGCHAT
            </p>
            <h1 className="mt-4 text-5xl font-black leading-[0.96]">
              Your messages, rooms, and calls in one place.
            </h1>
            <p className="mt-5 text-base leading-8 text-slate-300">
              Continue into the realtime workspace with chat threads, group rooms, social posts, status updates, and call entry points ready.
            </p>
          </div>

          <div className="mt-8 grid gap-3">
            {[
              ["Realtime inbox", MessageSquareText, "Unread state, typing, and media chat."],
              ["Protected auth", ShieldCheck, "Secure login flows and backend-only secrets."],
              ["Recruiter ready", Code2, "Demo account, screenshots, and polished flows."],
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

          <div className="mt-auto rounded-[1.75rem] border border-amber-300/15 bg-amber-300/10 px-5 py-4 text-sm font-semibold text-amber-100">
            Fastest path for review: use the demo account, inspect the messaging flow, then move into rooms, posts, and status.
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
                  <p className="text-sm text-slate-400">Sign in to continue</p>
                </div>
              </div>

              <Link href="/" className="app-button-ghost hidden px-4 py-3 text-sm sm:inline-flex">
                Home
              </Link>
            </div>

            <div className="mb-6 grid grid-cols-2 rounded-[1.2rem] border border-white/10 bg-white/5 p-1">
              <button className="rounded-[0.95rem] bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950">
                Log in
              </button>
              <Link
                href="/register"
                className="rounded-[0.95rem] px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-white/10"
              >
                Sign up
              </Link>
            </div>

            <div className="mb-6">
              <h2 className="text-3xl font-black text-white">Welcome back</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Enter your account details or open the demo workspace instantly.
              </p>
            </div>

            <form className="app-stagger space-y-4" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="username" className="mb-2 block text-sm font-semibold text-slate-200">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  name="username"
                  value={form.username}
                  placeholder="Enter your username"
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
                  placeholder="Enter your password"
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
                {isSubmitting ? "Signing in..." : "Sign in"}
                {!isSubmitting && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>

            <div className="my-6 flex items-center gap-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              <span className="h-px flex-1 bg-white/10" />
              Demo and Google
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={isDemoSubmitting}
                className="app-button-secondary w-full py-3.5 text-sm shadow-[0_14px_34px_rgba(16,185,129,0.12)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <PlayCircle className="h-4 w-4" />
                {isDemoSubmitting ? "Opening demo..." : "Continue with demo account"}
              </button>

              <a
                href="/api/auth/google"
                className="app-button-ghost flex w-full py-3.5 text-sm shadow-[0_12px_28px_rgba(15,23,42,0.08)]"
              >
                <Code2 className="h-4 w-4" />
                Continue with Google
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
