"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import axios from "axios";
import { Code2, PlayCircle } from "lucide-react";

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
      router.replace("/chat");
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
      router.replace("/chat");
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
    <div className="app-shell flex min-h-screen items-center justify-center px-4 py-10">
      <div className="app-panel w-full max-w-sm rounded-lg p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 text-sm font-black text-cyan-100">
            Eg
          </div>
          <h1 className="text-3xl font-bold text-white">Egchat</h1>
          <h2 className="mt-5 text-2xl font-semibold text-white">Welcome Back</h2>
          <p className="mt-2 text-sm text-gray-400">
            Please enter your details to sign in.
          </p>
        </div>

        <div className="mb-5 grid grid-cols-2 rounded-lg border border-white/10 bg-white/5 p-1">
          <button className="rounded-md bg-cyan-300 py-2 text-sm font-semibold text-slate-950">
            Log in
          </button>
          <Link
            href="/register"
            className="rounded-md py-2 text-center text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Sign up
          </Link>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="username" className="mb-2 block text-sm text-gray-200">
              Username
            </label>
            <input
              id="username"
              type="text"
              name="username"
              value={form.username}
              placeholder="Enter your username"
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition placeholder:text-gray-500 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
              onChange={handleChange}
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm text-gray-200">
              Password
            </label>
            <input
              id="password"
              type="password"
              name="password"
              value={form.password}
              placeholder="Enter your password"
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition placeholder:text-gray-500 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
              onChange={handleChange}
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-cyan-300 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-950/20 transition hover:-translate-y-0.5 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[1.5px] text-slate-500">
          <span className="h-px flex-1 bg-white/10" />
          Demo and Google
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={isDemoSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm font-bold text-emerald-100 transition hover:bg-emerald-300/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <PlayCircle className="h-4 w-4" />
            {isDemoSubmitting ? "Opening demo..." : "Continue with demo account"}
          </button>

          <a
            href="/api/auth/google"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"
          >
            <Code2 className="h-4 w-4" />
            Continue with Google
          </a>
        </div>
      </div>
    </div>
  );
}
