"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Cookies from "js-cookie";
import axios from "axios";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", password: "" });
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
      const res = await axios.post("/api/login", form);

      Cookies.set("user", JSON.stringify(res.data.user));
      setForm({ username: "", password: "" });
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || "Login failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="app-shell flex min-h-screen items-center justify-center px-4 py-10">
      <div className="app-panel w-full max-w-sm rounded-lg p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 text-sm font-black text-cyan-100">
            Egchat
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
      </div>
    </div>
  );
}
