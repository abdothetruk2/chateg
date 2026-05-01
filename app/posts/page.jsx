"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Cookies from "js-cookie";
import axios from "axios";
import {
  Briefcase,
  Code2,
  ImagePlus,
  MapPin,
  MessageCircle,
  Newspaper,
  Send,
  Smile,
  ThumbsUp,
  Trash2,
  UserRound,
  Users,
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

const quickEmotions = ["👍", "❤️", "😂", "🔥", "👏"];

function PostsSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((item) => (
        <article key={item} className="app-panel rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 animate-pulse rounded-full bg-white/10" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-40 animate-pulse rounded bg-white/10" />
              <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
            </div>
          </div>
          <div className="mt-4 h-4 w-5/6 animate-pulse rounded bg-white/10" />
          <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-white/10" />
          <div className="mt-4 h-48 animate-pulse rounded-lg bg-white/10" />
        </article>
      ))}
    </div>
  );
}

export default function PostsPage() {
  const fileInputRef = useRef(null);
  const [currentUser] = useState(() => getCurrentUser());
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState("profile");
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
        postType,
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

  function appendCommentEmoji(postId, emoji) {
    setCommentDrafts((prev) => ({
      ...prev,
      [postId]: `${prev[postId] || ""}${emoji}`,
    }));
  }

  async function deletePost(post) {
    if (!currentUser?._id || String(post?.user?._id) !== String(currentUser._id)) {
      return;
    }

    try {
      await axios.delete(`/api/posts/${post._id}`, {
        data: { userId: currentUser._id },
      });

      setPosts((prev) => prev.filter((item) => item._id !== post._id));
    } catch (deleteError) {
      console.error("Post delete failed:", deleteError);
    }
  }

  async function deleteComment(post, comment) {
    if (!currentUser?._id || !comment?._id) return;

    const ownsPost = String(post?.user?._id) === String(currentUser._id);
    const ownsComment = String(comment?.user?._id) === String(currentUser._id);

    if (!ownsPost && !ownsComment) return;

    try {
      const res = await axios.patch(`/api/posts/${post._id}`, {
        action: "delete-comment",
        userId: currentUser._id,
        commentId: comment._id,
      });

      updatePost(res.data);
    } catch (deleteError) {
      console.error("Comment delete failed:", deleteError);
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

        <section className="app-panel mb-5 overflow-hidden rounded-lg">
          <div className="relative h-48 bg-black/25">
            {currentUser?.coverPhoto ? (
              <Image
                src={currentUser.coverPhoto}
                alt={`${currentUser?.username || "User"} cover`}
                fill
                sizes="(max-width: 768px) 92vw, 720px"
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(34,211,238,0.24),rgba(15,23,42,0.82),rgba(16,185,129,0.18))]" />
            )}
          </div>

          <div className="-mt-12 px-4 pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-[#07111c] bg-[#07111c]">
                <Image
                  src={currentUser?.avatar || "/avatar.jpg"}
                  alt={currentUser?.username || "User"}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              </div>

              <div className="min-w-0 flex-1 pt-10 sm:pt-0">
                <h2 className="truncate text-2xl font-black">
                  {currentUser?.username || "Profile"}
                </h2>
                <p className="mt-1 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-slate-300">
                  {currentUser?.about || "No bio yet."}
                </p>

                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-300">
                  {currentUser?.jobTitle && (
                    <span className="flex items-center gap-1 rounded-lg bg-white/5 px-2.5 py-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-cyan-200" />
                      {currentUser.jobTitle}
                    </span>
                  )}
                  {currentUser?.location && (
                    <span className="flex items-center gap-1 rounded-lg bg-white/5 px-2.5 py-1.5">
                      <MapPin className="h-3.5 w-3.5 text-cyan-200" />
                      {currentUser.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1 rounded-lg bg-white/5 px-2.5 py-1.5">
                    <Code2 className="h-3.5 w-3.5 text-cyan-200" />
                    Developer: {currentUser?.developerName || "Abdo Khater"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

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

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {[
                  { value: "profile", label: "Profile", icon: UserRound },
                  { value: "group", label: "Group", icon: Users },
                ].map((item) => {
                  const Icon = item.icon;
                  const active = postType === item.value;

                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setPostType(item.value)}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition ${
                        active
                          ? "border-cyan-300/30 bg-cyan-300/15 text-cyan-100"
                          : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label} post
                    </button>
                  );
                })}
              </div>

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
          <PostsSkeleton />
        ) : posts.length === 0 ? (
          <div className="app-panel-muted rounded-lg p-6 text-center text-sm text-slate-300">
            No posts yet.
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => {
              const liked = hasLiked(post, currentUser?._id);
              const comments = post.comments || [];
              const ownsPost =
                String(post.user?._id || "") === String(currentUser?._id || "");

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
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">
                        {post.user?.username || "Unknown"}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        <span>{timeAgo(post.createdAt)}</span>
                        <span className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] font-bold text-cyan-100">
                          {post.postType === "group" ? "Group post" : "Profile post"}
                        </span>
                      </div>
                    </div>

                    {ownsPost && (
                      <button
                        type="button"
                        onClick={() => deletePost(post)}
                        title="Delete post"
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-red-500/10 hover:text-red-200"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
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
                        liked ? "like-hand-pop text-cyan-200" : "text-slate-300"
                      }`}
                    >
                      <ThumbsUp className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
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
                          className="group rounded-lg bg-white/[0.045] px-3 py-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex min-w-0 items-start gap-2">
                              <div className="relative mt-0.5 h-8 w-8 shrink-0 overflow-hidden rounded-full">
                                <Image
                                  src={comment.user?.avatar || "/avatar.jpg"}
                                  alt={comment.user?.username || "Comment author"}
                                  fill
                                  sizes="32px"
                                  className="object-cover"
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-xs font-bold text-cyan-100">
                                  {comment.user?.username || "User"}
                                </p>
                                {comment.user?.jobTitle && (
                                  <p className="truncate text-[11px] text-slate-500">
                                    {comment.user.jobTitle}
                                  </p>
                                )}
                              </div>
                            </div>
                            {(ownsPost ||
                              String(comment.user?._id || "") ===
                                String(currentUser?._id || "")) && (
                              <button
                                type="button"
                                onClick={() => deleteComment(post, comment)}
                                title="Delete comment"
                                className="rounded p-1 text-slate-500 opacity-0 transition hover:bg-red-500/10 hover:text-red-200 group-hover:opacity-100"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                          <p className="mt-2 pl-10 text-sm text-slate-200">
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
                    <div className="flex items-center gap-1">
                      {quickEmotions.slice(0, 3).map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => appendCommentEmoji(post._id, emoji)}
                          className="rounded-lg bg-white/5 px-2 py-2 text-sm transition hover:bg-white/10"
                          title={`Add ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => sendComment(post)}
                      disabled={!commentDrafts[post._id]?.trim()}
                      className="rounded-lg bg-cyan-300 p-2 text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {commentDrafts[post._id]?.trim() ? (
                        <Send className="h-4 w-4" />
                      ) : (
                        <Smile className="h-4 w-4" />
                      )}
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
