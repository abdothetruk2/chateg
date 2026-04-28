"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";

export default function RegisterPage() {
  const router = useRouter();
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

      Cookies.set("user", JSON.stringify(res.data.user));
      setForm({ username: "", password: "", email: "" });
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || "Register failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="app-shell flex min-h-screen items-center justify-center px-4 py-10">
      <div className="app-panel w-full max-w-sm rounded-lg p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 text-sm font-black text-cyan-100">
            Eg
          </div>
          <h1 className="text-3xl font-bold text-white">Nexchat</h1>
          <h2 className="mt-5 text-2xl font-semibold text-white">Create account</h2>
          <p className="mt-2 text-sm text-gray-400">
            Sign up and jump straight into your chats.
          </p>
        </div>

        <div className="mb-5 grid grid-cols-2 rounded-lg border border-white/10 bg-white/5 p-1">
          <Link
            href="/login"
            className="rounded-md py-2 text-center text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Log in
          </Link>
          <button className="rounded-md bg-cyan-300 py-2 text-sm font-semibold text-slate-950">
            Sign up
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="mb-2 block text-sm text-gray-200">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              name="email"
              value={form.email}
              placeholder="Enter your email"
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition placeholder:text-gray-500 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
              onChange={handleChange}
            />
          </div>

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
            {isSubmitting ? "Creating..." : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}
