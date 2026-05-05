"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import PostsPage from "../posts/page";

export default function ProtectedPostPage() {
  const router = useRouter();
  const { user, loading } = useSelector((state) => state.user);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, router, user]);

  if (loading || !user) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center px-6 text-slate-300">
        <div className="app-panel-muted rounded-lg px-6 py-5">
          Opening posts...
        </div>
      </div>
    );
  }

  return <PostsPage />;
}
