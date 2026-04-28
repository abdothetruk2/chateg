"use client";

import axios from "axios";
import Cookies from "js-cookie";
import { AnimatePresence, motion } from "framer-motion";
import { CircleXIcon, Users } from "lucide-react";
import { useState } from "react";

function getCurrentUser() {
  try {
    const cookieUser = Cookies.get("user");
    if (!cookieUser) return null;

    const parsedUser = JSON.parse(cookieUser);
    return Array.isArray(parsedUser) ? parsedUser[0] : parsedUser;
  } catch (error) {
    console.error("Invalid user cookie", error);
    return null;
  }
}

export default function CreateGroup({ open, close }) {
  const [group, setGroup] = useState({ name: "" });
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  async function handleCreateGroup(e) {
    e.preventDefault();

    const user = getCurrentUser();
    const groupName = group.name.trim();

    if (!groupName) {
      setError("Enter group name");
      return;
    }

    if (!user?._id) {
      setError("User not found");
      return;
    }

    try {
      setIsCreating(true);
      setError("");

      await axios.post("/api/creategroup", {
        name: groupName,
        user_id: user._id,
      });

      setGroup({ name: "" });
      close?.();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create group.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close?.();
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.94, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 18, scale: 0.96, filter: "blur(8px)" }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-[420px] rounded-2xl border border-white/10 bg-[#171717] p-5 text-white shadow-2xl shadow-black/50"
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-lg font-bold">Create Group</h1>
                  <p className="text-xs text-white/40">Add members later.</p>
                </div>
              </div>

              <button
                onClick={close}
                type="button"
                className="rounded-lg p-1.5 transition hover:bg-white/10"
              >
                <CircleXIcon className="h-6 w-6 text-white/70 hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="grid gap-3">
              <input
                name="name"
                value={group.name}
                onChange={(e) =>
                  setGroup((prev) => ({
                    ...prev,
                    [e.target.name]: e.target.value,
                  }))
                }
                className="rounded-lg border border-white/10 bg-white/10 p-3 text-white outline-none transition placeholder:text-white/30 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20"
                type="text"
                placeholder="Enter group name"
              />

              {error && (
                <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {error}
                </p>
              )}

              <button
                disabled={isCreating}
                className="rounded-lg bg-white p-3 font-semibold text-black transition hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreating ? "Creating..." : "Create Group"}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
