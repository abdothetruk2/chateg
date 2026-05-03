"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Cookies from "js-cookie";
import axios from "axios";
import { allEmotionEmojis } from "../../lib/emotions";
import {
  BadgeCheck,
  Briefcase,
  CalendarDays,
  Code2,
  Edit3,
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

function PostsSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((item) => (
        <article
          key={item}
          className="app-premium-card app-loading-card app-post-card rounded-[1.75rem] p-4"
          style={{ animationDelay: `${item * 90}ms` }}
        >
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
  const commentInputRefs = useRef({});
  const [currentUser, setCurrentUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState("profile");
  const [selectedFile, setSelectedFile] = useState(null);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [openEmotionPostId, setOpenEmotionPostId] = useState("");
  const [coverPointer, setCoverPointer] = useState({
    x: 50,
    y: 50,
    tiltX: 0,
    tiltY: 0,
  });
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

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

    const userId = String(currentUser._id);
    const liked = hasLiked(post, userId);
    const previousPost = post;
    const currentLikes = Array.isArray(post.likes) ? post.likes : [];
    const nextLikes = liked
      ? currentLikes.filter((item) => String(item) !== userId)
      : [...currentLikes, currentUser._id];
    const optimisticPost = {
      ...post,
      likes: nextLikes,
    };

    updatePost(optimisticPost);

    try {
      const res = await axios.patch(`/api/posts/${post._id}`, {
        action: "like",
        userId: currentUser._id,
      });

      updatePost(res.data);
    } catch (likeError) {
      console.error("Like failed:", likeError);
      updatePost(previousPost);
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
    setOpenEmotionPostId("");
    commentInputRefs.current[postId]?.focus();
  }

  function handleCoverPointerMove(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(
      0,
      Math.min(100, ((event.clientX - rect.left) / rect.width) * 100)
    );
    const y = Math.max(
      0,
      Math.min(100, ((event.clientY - rect.top) / rect.height) * 100)
    );

    setCoverPointer({
      x,
      y,
      tiltX: (50 - y) / 22,
      tiltY: (x - 50) / 24,
    });
  }

  function resetCoverPointer() {
    setCoverPointer({
      x: 50,
      y: 50,
      tiltX: 0,
      tiltY: 0,
    });
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

  const profilePosts = posts.filter(
    (post) => String(post?.user?._id || "") === String(currentUser?._id || "")
  );
  const profileLikeCount = profilePosts.reduce(
    (total, post) => total + (post?.likes?.length || 0),
    0
  );
  const profileCommentCount = profilePosts.reduce(
    (total, post) => total + (post?.comments?.length || 0),
    0
  );
  const profileStats = [
    { label: "Posts", value: profilePosts.length, icon: Newspaper },
    { label: "Likes", value: profileLikeCount, icon: ThumbsUp },
    { label: "Comments", value: profileCommentCount, icon: MessageCircle },
  ];

  return (
    <div className="app-shell grid min-h-screen grid-cols-1 pb-14 text-white md:grid-cols-[minmax(18rem,22rem)_1fr] lg:grid-cols-[4.5rem_minmax(22rem,1fr)] lg:pb-0">
      <Sidebar />

      <main className="mx-auto w-full max-w-3xl px-4 py-6 md:px-8">
        <header className="app-page-header">
          <div>
            <div className="app-kicker">
              <Newspaper className="h-4 w-4" />
              Social
            </div>
            <h1 className="app-page-title app-gradient-text">Posts</h1>
            <p className="mt-2 text-sm text-slate-400">
              Share updates, media, and quick comments across the workspace.
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-300/15 text-cyan-200">
            <Newspaper className="h-6 w-6" />
          </div>
        </header>

        <section className="app-premium-card app-gradient-accent app-reveal mb-5 overflow-hidden rounded-[1.75rem]">
          <div
            className="app-profile-cover app-cover-photo-effect relative h-52 overflow-hidden bg-black/25 sm:h-60"
            onPointerMove={handleCoverPointerMove}
            onPointerLeave={resetCoverPointer}
            style={{
              "--cover-x": `${coverPointer.x}%`,
              "--cover-y": `${coverPointer.y}%`,
              "--cover-tilt-x": `${coverPointer.tiltX}deg`,
              "--cover-tilt-y": `${coverPointer.tiltY}deg`,
            }}
          >
            {currentUser?.coverPhoto ? (
              <Image
                src={currentUser.coverPhoto}
                alt={`${currentUser?.username || "User"} cover`}
                fill
                sizes="(max-width: 768px) 92vw, 720px"
                className="app-cover-photo-image object-cover"
              />
            ) : (
              <div className="app-cover-photo-placeholder absolute inset-0" />
            )}
            <div className="app-cover-photo-sheen" />
            <div className="absolute inset-0 z-[3] bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 z-[4] flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-100">
                  Profile
                </p>
                <h2 className="mt-1 truncate text-3xl font-black text-white">
                  {currentUser?.username || "Your profile"}
                </h2>
              </div>
              <Link
                href="/settings"
                className="app-button-secondary hidden px-4 py-2.5 text-sm sm:inline-flex"
              >
                <Edit3 className="h-4 w-4" />
                Edit
              </Link>
            </div>
          </div>

          <div className="-mt-12 px-4 pb-5 sm:px-5">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
              <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-[1.75rem] border-4 border-[#07111c] bg-[#07111c] shadow-2xl shadow-black/30">
                <Image
                  src={currentUser?.avatar || "/avatar.jpg"}
                  alt={currentUser?.username || "User"}
                  fill
                  sizes="112px"
                  className="object-cover"
                />
                <span className="absolute bottom-2 right-2 h-4 w-4 rounded-full border-2 border-[#07111c] bg-emerald-400" />
              </div>

              <div className="min-w-0 flex-1 pt-9 sm:pt-0">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h2 className="flex items-center gap-2 truncate text-2xl font-black">
                      <span className="truncate">{currentUser?.username || "Profile"}</span>
                      <BadgeCheck className="h-5 w-5 shrink-0 text-cyan-200" />
                    </h2>
                    <p className="mt-1 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-slate-300">
                      {currentUser?.about || "No bio yet. Add a short profile summary from settings."}
                    </p>
                  </div>
                  <Link
                    href="/settings"
                    className="app-button-secondary inline-flex px-4 py-2.5 text-sm sm:hidden"
                  >
                    <Edit3 className="h-4 w-4" />
                    Edit profile
                  </Link>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-300">
                  {currentUser?.jobTitle && (
                    <span className="flex items-center gap-1 rounded-xl bg-white/5 px-2.5 py-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-cyan-200" />
                      {currentUser.jobTitle}
                    </span>
                  )}
                  {currentUser?.location && (
                    <span className="flex items-center gap-1 rounded-xl bg-white/5 px-2.5 py-1.5">
                      <MapPin className="h-3.5 w-3.5 text-cyan-200" />
                      {currentUser.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1 rounded-xl bg-white/5 px-2.5 py-1.5">
                    <Code2 className="h-3.5 w-3.5 text-cyan-200" />
                    Developer: {currentUser?.developerName || "Abdo Khater"}
                  </span>
                  {currentUser?.createdAt && (
                    <span className="flex items-center gap-1 rounded-xl bg-white/5 px-2.5 py-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-cyan-200" />
                      Joined {new Date(currentUser.createdAt).getFullYear()}
                    </span>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  {profileStats.map((item) => {
                    const Icon = item.icon;

                    return (
                      <div key={item.label} className="app-stat-card rounded-2xl px-3 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                            {item.label}
                          </p>
                          <Icon className="h-4 w-4 text-cyan-200" />
                        </div>
                        <p className="mt-1 text-xl font-black text-white">
                          {item.value}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="app-premium-card app-post-card mb-5 rounded-[1.75rem] p-4">
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
                className="app-input min-h-24 w-full resize-none rounded-2xl px-4 py-3 text-sm text-white"
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
                      className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-bold transition ${
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
                <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-white/5 px-3 py-2 text-sm text-slate-300">
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
                  className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
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
                  className="app-button-primary px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
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
          <div className="app-empty-state rounded-[1.75rem] p-6 text-center text-sm text-slate-300">
            <p className="font-black text-white">No posts yet</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Share the first update with text, media, or a quick team note.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => {
              const liked = hasLiked(post, currentUser?._id);
              const comments = post.comments || [];
              const ownsPost =
                String(post.user?._id || "") === String(currentUser?._id || "");

              return (
                <article key={post._id} className="app-premium-card app-post-card rounded-[1.75rem] p-4">
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
                    <p className="app-theme-text mt-4 whitespace-pre-wrap text-sm font-semibold leading-6">
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
                      className={`app-like-button flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold hover:bg-white/10 ${
                        liked
                          ? "app-like-button-active like-hand-pop text-cyan-200"
                          : "text-slate-300"
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
                          className="group app-section-card rounded-2xl px-3 py-2"
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

                  <div className="mt-3 space-y-2">
                    {openEmotionPostId === post._id && (
                      <div className="app-scale-in flex max-h-44 w-fit max-w-full flex-wrap items-center gap-1 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.055] p-2">
                        {allEmotionEmojis.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => appendCommentEmoji(post._id, emoji)}
                            className="rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-sm transition hover:-translate-y-0.5 hover:bg-white/10"
                            title={`Add ${emoji}`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <input
                        ref={(input) => {
                          if (input) {
                            commentInputRefs.current[post._id] = input;
                          } else {
                            delete commentInputRefs.current[post._id];
                          }
                        }}
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
                        className="app-input min-w-0 flex-1 rounded-2xl px-4 py-2 text-sm text-white"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setOpenEmotionPostId((current) =>
                            current === post._id ? "" : post._id
                          )
                        }
                        className={`rounded-2xl border p-2.5 transition hover:-translate-y-0.5 ${
                          openEmotionPostId === post._id
                            ? "border-cyan-300/35 bg-cyan-300/15 text-cyan-100"
                            : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                        }`}
                        title="Show emotions"
                      >
                        <Smile className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => sendComment(post)}
                        disabled={!commentDrafts[post._id]?.trim()}
                        className="rounded-2xl bg-cyan-300 p-2.5 text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
                        title="Send comment"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
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
