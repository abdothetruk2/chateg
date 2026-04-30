"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Cookies from "js-cookie";
import axios from "axios";
import {
  Heart,
  ImagePlus,
  MessageCircle,
  Newspaper,
  Send,
  X,
} from "lucide-react";
import Sidebar from "../components/Sidebar";

function getCurrentUser() {
  try {
    const cookieUser = Cookies.get("user");
    if (!cookieUser) return null;

    const parsedUser = JSON.parse(cookieUser);
    return Array.isArray(parsedUser) ? parsedUser[0] : parsedUser;
  } catch {
    return null;
  }
}

function isVideoMedia(item) {
  const mediaType = String(item?.mediaType || "").toLowerCase();
  const mediaUrl = String(item?.mediaUrl || "").toLowerCase();

  return (
    mediaType.startsWith("video/") ||
    /\.(mp4|webm|ogg|mov)$/i.test(mediaUrl)
  );
}

function timeAgo(date) {
  if (!date) return "";

  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (!Number.isFinite(seconds) || seconds < 60) return "Just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  return `${Math.floor(hours / 24)}d`;
}

function hasLiked(post, userId) {
  return (post?.likes || []).some((item) => String(item) === String(userId));
}

export default function PostsPage() {
  const fileInputRef = useRef(null);
  const [currentUser] = useState(() => getCurrentUser());
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchPosts() {
      try {
        setLoading(true);
        setError("");
        const res = await axios.get("/api/posts");
        setPosts(Array.isArray(res.data) ? res.data : []);
      } catch (fetchError) {
        console.error("Posts fetch failed:", fetchError);
        setError("Could not load posts.");
      } finally {
        setLoading(false);
      }
    }

    fetchPosts();
  }, []);

  function updatePost(nextPost) {
    setPosts((prev) =>
      prev.map((post) => (post._id === nextPost._id ? nextPost : post))
    );
  }

  async function createPost() {
    const text = content.trim();
    if ((!text && !selectedFile) || !currentUser?._id || posting) return;

    try {
      setPosting(true);
      setError("");

      let mediaUrl = "";
      let mediaType = "";

      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("userId", currentUser._id);

        const uploadRes = await axios.post("/api/postmedia", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        mediaUrl = uploadRes.data?.mediaUrl || "";
        mediaType = uploadRes.data?.mediaType || selectedFile.type || "";
      }

      const res = await axios.post("/api/posts", {
        userId: currentUser._id,
        content: text,
        mediaUrl,
        mediaType,
      });

      setPosts((prev) => [res.data, ...prev]);
      setContent("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (createError) {
      console.error("Post create failed:", createError);
      setError(createError?.response?.data?.message || "Could not create post.");
    } finally {
      setPosting(false);
    }
  }

  async function toggleLike(post) {
    if (!currentUser?._id) return;

    try {
      const res = await axios.patch(`/api/posts/${post._id}`, {
        action: "like",
        userId: currentUser._id,
      });

      updatePost(res.data);
    } catch (likeError) {
      console.error("Like failed:", likeError);
    }
  }

  async function sendComment(post) {
    const message = (commentDrafts[post._id] || "").trim();
    if (!message || !currentUser?._id) return;

    try {
      const res = await axios.patch(`/api/posts/${post._id}`, {
        action: "comment",
        userId: currentUser._id,
        message,
      });

      updatePost(res.data);
      setCommentDrafts((prev) => ({ ...prev, [post._id]: "" }));
    } catch (commentError) {
      console.error("Comment failed:", commentError);
    }
  }

  return (
    <div className="app-shell grid min-h-screen grid-cols-1 pb-14 text-white md:grid-cols-[minmax(18rem,22rem)_1fr] lg:grid-cols-[4.5rem_minmax(22rem,1fr)] lg:pb-0">
      <Sidebar />

      <main className="mx-auto w-full max-w-3xl px-4 py-6 md:px-8">
        <header className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[2px] text-cyan-200">
              Social
            </p>
            <h1 className="text-2xl font-black">Posts</h1>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-cyan-300/15 text-cyan-200">
            <Newspaper className="h-6 w-6" />
          </div>
        </header>

        <section className="app-panel mb-5 rounded-lg p-4">
          <div className="flex gap-3">
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full">
              <Image
                src={currentUser?.avatar || "/avatar.jpg"}
                alt={currentUser?.username || "User"}
                fill
                sizes="44px"
                className="object-cover"
              />
            </div>

            <div className="min-w-0 flex-1">
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="What's on your mind?"
                className="min-h-24 w-full resize-none rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/45"
              />

              {selectedFile && (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2 text-sm text-slate-300">
                  <span className="truncate">{selectedFile.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="rounded-lg p-1 hover:bg-white/10"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {error && <p className="mt-2 text-sm text-red-300">{error}</p>}

              <div className="mt-3 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
                >
                  <ImagePlus className="h-4 w-4" />
                  Media
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                />

                <button
                  type="button"
                  onClick={createPost}
                  disabled={posting || (!content.trim() && !selectedFile)}
                  className="flex items-center gap-2 rounded-lg bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  {posting ? "Posting..." : "Post"}
                </button>
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="app-panel-muted rounded-lg p-4 text-sm text-slate-300">
            Loading posts...
          </div>
        ) : posts.length === 0 ? (
          <div className="app-panel-muted rounded-lg p-6 text-center text-sm text-slate-300">
            No posts yet.
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => {
              const liked = hasLiked(post, currentUser?._id);
              const comments = post.comments || [];

              return (
                <article key={post._id} className="app-panel rounded-lg p-4">
                  <header className="flex items-center gap-3">
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full">
                      <Image
                        src={post.user?.avatar || "/avatar.jpg"}
                        alt={post.user?.username || "User"}
                        fill
                        sizes="44px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-bold">
                        {post.user?.username || "Unknown"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {timeAgo(post.createdAt)}
                      </p>
                    </div>
                  </header>

                  {post.content && (
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-100">
                      {post.content}
                    </p>
                  )}

                  {post.mediaUrl && (
                    <div className="mt-4 overflow-hidden rounded-lg bg-black/30">
                      {isVideoMedia(post) ? (
                        <video
                          src={post.mediaUrl}
                          controls
                          className="max-h-[520px] w-full object-contain"
                        />
                      ) : (
                        <Image
                          src={post.mediaUrl}
                          alt="post media"
                          width={960}
                          height={640}
                          sizes="(max-width: 768px) 92vw, 720px"
                          className="max-h-[520px] w-full object-cover"
                        />
                      )}
                    </div>
                  )}

                  <div className="mt-4 flex items-center gap-3 border-y border-white/10 py-2">
                    <button
                      type="button"
                      onClick={() => toggleLike(post)}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition hover:bg-white/10 ${
                        liked ? "text-rose-300" : "text-slate-300"
                      }`}
                    >
                      <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
                      {(post.likes || []).length}
                    </button>
                    <div className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-300">
                      <MessageCircle className="h-4 w-4" />
                      {comments.length}
                    </div>
                  </div>

                  {comments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {comments.slice(-3).map((comment) => (
                        <div
                          key={comment._id || `${comment.user?._id}-${comment.createdAt}`}
                          className="rounded-lg bg-white/[0.045] px-3 py-2"
                        >
                          <p className="text-xs font-bold text-cyan-100">
                            {comment.user?.username || "User"}
                          </p>
                          <p className="mt-1 text-sm text-slate-200">
                            {comment.message}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-2">
                    <input
                      value={commentDrafts[post._id] || ""}
                      onChange={(event) =>
                        setCommentDrafts((prev) => ({
                          ...prev,
                          [post._id]: event.target.value,
                        }))
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          sendComment(post);
                        }
                      }}
                      placeholder="Write a comment..."
                      className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/20 px-4 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/45"
                    />
                    <button
                      type="button"
                      onClick={() => sendComment(post)}
                      disabled={!commentDrafts[post._id]?.trim()}
                      className="rounded-lg bg-cyan-300 p-2 text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
