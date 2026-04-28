"use client";

import Image from "next/image";
import axios from "axios";
import {
  ChevronRight,
  Save,
  Pencil,
  BadgeCheck,
  Mail,
  CheckCircle2,
  Sun,
  Moon,
  Monitor,
  Shield,
  Eye,
  CheckCheck,
  Ban,
  Cloud,
  Check,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import Cookies from "js-cookie";

export default function ProfileSettingsPage() {
  const inputRef = useRef(null);

  const cookieUser = useMemo(() => {
    try {
      const raw = Cookies.get("user");
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed[0] : parsed;
    } catch {
      return null;
    }
  }, []);

  const [user, setUser] = useState(cookieUser);
  const [previewUrl, setPreviewUrl] = useState(cookieUser?.avatar || "/avatar.jpg");
  const [selectedFile, setSelectedFile] = useState(null);

  const [form, setForm] = useState({
    displayName: cookieUser?.username || "",
    username: cookieUser?.username || "",
    about: "Hey there! I am using EgChat. 🚀",
    email: cookieUser?.email || "",
    themeMode: "light",
    themeColor: "Emerald",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function fetchUser() {
      if (!cookieUser?._id) return;

      try {
        const { data } = await axios.get(`/api/getuser?id=${cookieUser._id}`);

        const fetchedUser = data?.user || data;
        if (!fetchedUser) return;

        setUser(fetchedUser);
        setPreviewUrl(fetchedUser.avatar || "/avatar.jpg");

        setForm((prev) => ({
          ...prev,
          displayName: fetchedUser.username || "",
          username: fetchedUser.username || "",
          email: fetchedUser.email || "",
          about: fetchedUser.about || prev.about,
        }));
      } catch (err) {
        console.error("Failed to fetch user:", err);
      }
    }

    fetchUser();
  }, [cookieUser?._id]);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function handleInputChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleChange(e) {
    const pickedFile = e.target.files?.[0];
    if (!pickedFile) return;

    setError("");
    setMessage("");

    if (!pickedFile.type.startsWith("image/")) {
      setError("Please choose an image file only.");
      return;
    }

    if (pickedFile.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5 MB.");
      return;
    }

    const objectUrl = URL.createObjectURL(pickedFile);
    setSelectedFile(pickedFile);
    setPreviewUrl(objectUrl);
  }

  async function handleUpload() {
    if (!selectedFile) {
      setError("Choose a file first.");
      return;
    }

    if (!user?._id) {
      setError("User not found.");
      return;
    }

    try {
      setIsUploading(true);
      setError("");
      setMessage("");

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("user_id", user._id);

      const { data } = await axios.post("/api/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const newAvatar = data?.avatar;

      if (newAvatar) {
        const updatedUser = { ...user, avatar: newAvatar };
        setUser(updatedUser);
        setPreviewUrl(newAvatar);
        Cookies.set("user", JSON.stringify(updatedUser));
      }

      setSelectedFile(null);
      setMessage(data?.message || "Avatar updated successfully.");

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSaveProfile() {
    if (!user?._id) {
      setError("User not found.");
      return;
    }

    try {
      setIsSaving(true);
      setError("");
      setMessage("");

      const payload = {
        user_id: user._id,
        username: form.username,
        displayName: form.displayName,
        about: form.about,
        themeMode: form.themeMode,
        themeColor: form.themeColor,
      };

      const { data } = await axios.put("/api/updateuser", payload);

      const updatedUser = {
        ...user,
        username: data?.user?.username || form.username,
        about: data?.user?.about || form.about,
        avatar: data?.user?.avatar || user.avatar,
        email: data?.user?.email || user.email,
      };

      setUser(updatedUser);
      Cookies.set("user", JSON.stringify(updatedUser));
      setMessage(data?.message || "Profile updated successfully.");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save profile.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleReset() {
    setSelectedFile(null);
    setPreviewUrl(user?.avatar || "/avatar.jpg");
    setError("");
    setMessage("");

    setForm({
      displayName: user?.username || "",
      username: user?.username || "",
      about: user?.about || "Hey there! I am using EgChat. 🚀",
      email: user?.email || "",
      themeMode: "light",
      themeColor: "Emerald",
    });

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  const themeColors = [
    { name: "Emerald", color: "bg-cyan-400" },
    { name: "Blue", color: "bg-blue-500" },
    { name: "Purple", color: "bg-violet-500" },
    { name: "Rose", color: "bg-rose-500" },
    { name: "Amber", color: "bg-amber-500" },
    { name: "Cyan", color: "bg-cyan-500" },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl pb-24">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-[#07111c]/95 px-6 py-5 backdrop-blur-md lg:px-10">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-400">
            <span>Settings</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-white">Profile</span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-white">
            Profile Settings
          </h2>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="hidden rounded-lg border border-white/10 px-4 py-2 text-sm font-bold text-slate-300 transition-colors hover:bg-white/5 sm:flex sm:items-center sm:justify-center"
          >
            Cancel
          </button>

          <button
            onClick={handleSaveProfile}
            disabled={isSaving}
            className="flex items-center justify-center gap-2 rounded-lg bg-cyan-400 px-5 py-2 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-400/20 transition-all hover:bg-cyan-300 hover:shadow-cyan-400/40 active:scale-95 disabled:opacity-50"
          >
            <Save className="h-[18px] w-[18px]" />
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </header>

      <div className="px-6 py-8 lg:px-10">
        <div className="space-y-8">
          <div className="rounded-lg border border-white/10 bg-white/[0.045] p-6 shadow-sm sm:p-8">
            <div className="flex flex-col items-center gap-8 sm:flex-row">
              <div className="relative">
                <div className="relative h-36 w-36 overflow-hidden rounded-full ring-4 ring-white/5 shadow-xl">
                  <Image
                    src={previewUrl || user.avatar}
                    alt="Profile"
                    fill
                    className="object-cover"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#07111c] bg-cyan-400 text-[#07111c] shadow-lg transition-all hover:scale-110 hover:bg-cyan-300"
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleChange}
                    className="hidden"
                  />
                  <Pencil className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 space-y-2 text-center sm:text-left">
                <h3 className="text-xl font-bold text-white">Profile Photo</h3>

                <p className="mx-auto max-w-md text-sm text-slate-400 sm:mx-0">
                  Upload a new avatar. Maximum upload size is 5 MB.
                </p>

                {message && <p className="text-sm text-cyan-400">{message}</p>}
                {error && <p className="text-sm text-red-400">{error}</p>}

                <div className="flex flex-wrap justify-center gap-3 pt-2 sm:justify-start">
                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={isUploading || !selectedFile}
                    className="rounded-lg bg-white/10 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isUploading ? "Uploading..." : "Upload New"}
                  </button>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="rounded-lg px-4 py-2 text-sm font-bold text-red-500 transition-colors hover:bg-red-500/10"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-6 rounded-lg border border-white/10 bg-white/[0.045] p-6 shadow-sm sm:p-8 lg:col-span-2">
              <h3 className="mb-2 flex items-center gap-2 border-b border-white/10 pb-4 text-lg font-bold text-white">
                <BadgeCheck className="h-5 w-5 text-cyan-400" />
                Personal Information
              </h3>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-300">
                    Display Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="displayName"
                      value={form.displayName}
                      onChange={handleInputChange}
                      className="h-12 w-full rounded-xl border border-white/10 bg-[#08111d] px-4 font-medium text-white focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                    />
                    <Pencil className="absolute right-4 top-3.5 h-[18px] w-[18px] text-slate-400" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-300">
                    Username
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-base font-medium text-slate-400">
                      @
                    </span>
                    <input
                      type="text"
                      name="username"
                      value={form.username}
                      onChange={handleInputChange}
                      className="h-12 w-full rounded-xl border border-white/10 bg-[#08111d] pl-8 pr-4 font-medium text-white focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-300">About</label>
                <textarea
                  name="about"
                  value={form.about}
                  onChange={handleInputChange}
                  maxLength={140}
                  className="h-28 w-full resize-none rounded-xl border border-white/10 bg-[#08111d] p-4 text-white focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                />
                <p className="text-right text-xs text-slate-400">
                  {form.about.length}/140 characters
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-300">
                  Email Address
                </label>

                <div className="relative flex-1">
                  <Mail className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                  <input
                    type="email"
                    disabled
                    value={form.email}
                    readOnly
                    className="h-12 w-full cursor-not-allowed rounded-xl bg-black/20 pl-11 pr-4 font-medium text-slate-400"
                  />
                </div>

                <p className="flex items-center gap-1 pt-1 text-xs text-slate-500">
                  <CheckCircle2 className="h-4 w-4 fill-green-500 text-green-500" />
                  Verified
                </p>
              </div>

              <div className="space-y-4 border-t border-white/10 pt-4">
                <label className="text-sm font-bold text-slate-300">
                  Theme Mode
                </label>

                <div className="flex rounded-xl bg-black/20 p-1">
                  {["light", "dark", "system"].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({ ...prev, themeMode: mode }))
                      }
                      className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${
                        form.themeMode === mode
                          ? "bg-white/[0.045] text-white shadow-sm"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {mode === "light" && <Sun className="h-[18px] w-[18px]" />}
                      {mode === "dark" && <Moon className="h-[18px] w-[18px]" />}
                      {mode === "system" && (
                        <Monitor className="h-[18px] w-[18px]" />
                      )}
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 space-y-4 border-t border-white/10 pt-6">
                <label className="text-sm font-bold text-slate-300">
                  Theme Color
                </label>

                <div className="flex flex-wrap gap-4">
                  {themeColors.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      title={item.name}
                      onClick={() =>
                        setForm((prev) => ({ ...prev, themeColor: item.name }))
                      }
                      className={`relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all hover:scale-110 active:scale-95 ${item.color} ${
                        form.themeColor === item.name
                          ? "border-white shadow-[0_0_15px_rgba(34,211,238,0.3)]"
                          : "border-transparent"
                      }`}
                    >
                      {form.themeColor === item.name && (
                        <Check className="h-[18px] w-[18px] text-white" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="rounded-lg border border-white/10 bg-white/[0.045] p-6 shadow-sm">
                <h3 className="mb-5 flex items-center gap-2 text-lg font-bold text-white">
                  <Shield className="h-5 w-5 text-cyan-400" />
                  Privacy
                </h3>

                <div className="space-y-1">
                  <div className="flex items-center justify-between rounded-xl p-3 hover:bg-white/5 -mx-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                        <Eye className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Last Seen</p>
                        <p className="text-xs text-slate-400">Everyone</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-400" />
                  </div>

                  <div className="flex items-center justify-between rounded-xl p-3 hover:bg-white/5 -mx-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-400">
                        <CheckCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">
                          Read Receipts
                        </p>
                        <p className="text-xs text-slate-400">
                          Show when you read messages
                        </p>
                      </div>
                    </div>
                    <label className="relative ml-2 inline-flex cursor-pointer items-center">
                      <input type="checkbox" defaultChecked className="peer sr-only" />
                      <div className="h-6 w-10 rounded-full bg-white/10 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-cyan-400 peer-checked:after:translate-x-full" />
                    </label>
                  </div>

                  <div className="flex items-center justify-between rounded-xl p-3 hover:bg-white/5 -mx-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
                        <Ban className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Blocked</p>
                        <p className="text-xs text-slate-400">12 contacts</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-400" />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/[0.045] p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
                  <Cloud className="h-5 w-5 text-cyan-400" />
                  Storage
                </h3>

                <div className="space-y-3">
                  <div className="flex items-end justify-between text-sm">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Used
                      </span>
                      <span className="text-lg font-bold text-white">1.2 GB</span>
                    </div>

                    <div className="flex flex-col items-end">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Total
                      </span>
                      <span className="text-sm font-medium text-white">5.0 GB</span>
                    </div>
                  </div>

                  <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-[24%] bg-cyan-400" />
                    <div className="h-full w-[15%] bg-blue-500" />
                    <div className="h-full w-[8%] bg-violet-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
